export async function callFrappeApi(method, args = {}) {
  const response = await fetch('/api/method/' + method, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Frappe-CSRF-Token': window.frappe?.csrf_token || ''
    },
    body: JSON.stringify(args)
  })

  const data = await response.json()
  
  if (!response.ok || data.exc) {
    let errorMsg = data._server_messages 
      ? JSON.parse(JSON.parse(data._server_messages)[0]).message 
      : 'Server Error'
    throw new Error(errorMsg)
  }
  
  return data.message
}
