const puppeteer = require('puppeteer')
const rp = require('request-promise')
const fs = require('fs').promises
const assert = require('assert')

const EMAIL = process.argv[2]
const PASSWORD = process.argv[3]
const LINE_TOKEN = process.argv[4]

assert(EMAIL)
assert(PASSWORD)
assert(LINE_TOKEN)

/**
 * @param {puppeteer.Page} page
 * @param {string} email
 * @param {string} password
 */
async function login (page, email, password) {
  try {
    const cookiesString = await fs.readFile('./cookies.json')
    const cookies = JSON.parse(cookiesString)
    await page.setCookie(...cookies)
  } catch (err) {
    console.warn(err.message)
  }

  const res = await page.goto('https://dairy.zyanwoa.com/member/alert/jsonAlert')
  if (!res.ok()) {
    console.log('login as', email)
    await page.goto('https://dairy.zyanwoa.com/login_member')
    await page.waitForSelector('#emailEmailField')
    await page.type('#emailEmailField', email)
    await page.type('#passwordField', password)
    await Promise.all([
      page.click('#loginSubmitButton'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ])
    const cookies = await page.cookies()
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2))
  }
}

;(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await login(page, EMAIL, PASSWORD)

  const res = await page.goto('https://dairy.zyanwoa.com/member/alert/jsonAlert')
  const { today = [] } = await res.json()
  if (today.length) {
    const message = today.map(t => `\n[${t[3]}] ${t[7]} - ${t[4]}`).join('')
    await rp.post({
      url: 'https://notify-api.line.me/api/notify',
      headers: {
        Authorization: `Bearer ${LINE_TOKEN}`
      },
      formData: { message },
      json: true
    })
  }

  await page.close()
  await browser.close()
})()
