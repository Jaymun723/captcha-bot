// The page url
// We assume the backend is on the same address
const pageUrl = `${window.location.protocol}//${window.location.host}/`

// Used by the reCaptcha script
// Called when the library is loaded
var onloadCallback = async function() {
  // This get the reCaptcha site key
  const res = await fetch(`${pageUrl}key`)
  const { key } = await res.json()

  // Render the captcha
  grecaptcha.render("root", {
    sitekey: key,
    callback: verifyCallback,
  })
}

// Called when the captcha has been completed
const verifyCallback = (res) => {
  // This get the value of ?valID=
  const currentUrl = new URL(window.location.href)
  const valID = currentUrl.searchParams.get("valID")

  if (valID) {
    // We redirect the user to check the captcha token
    const redirectUrl = `${pageUrl}val?token=${res}&valID=${valID}`
    window.location.replace(redirectUrl)
  }
}
