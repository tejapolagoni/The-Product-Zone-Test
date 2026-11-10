function getTargetUrl(requestUrl, method, apiOrigin) {
  const base = new URL(apiOrigin);
  const target = new URL(requestUrl, base);
  if (base.protocol !== 'https:' || target.origin !== base.origin) {
    throw new Error('API proxy requests must remain on the configured HTTPS origin.');
  }
  if (method === 'GET' && /^\/api\/uploads\/[^/]+$/.test(target.pathname)) {
  target.pathname = target.pathname.replace(/^\/api/, '');
 }
  return target;
}

module.exports = function proxyApi(request, response) {
  const apiOrigin = process.env.RENDER_API_URL;
  if (!apiOrigin) {
    response.statusCode = 503;
    response.end('RENDER_API_URL is not configured.');
    return;
  }

  let target;
  try {
    target = getTargetUrl(request.url, request.method, apiOrigin);
    if (target.protocol !== 'https:') throw new Error('API origin must use HTTPS.');
  } catch {
    response.statusCode = 500;
    response.end('The API proxy is not configured with a valid HTTPS origin.');
    return;
  }

  const proxyRequest = require('node:https').request(target, {
    method: request.method,
    headers: {
      ...request.headers,
      host: target.host
    }
  }, proxyResponse => {
    response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });

  proxyRequest.on('error', () => {
    if (!response.headersSent) response.statusCode = 502;
    response.end('The product API could not be reached.');
  });
  request.pipe(proxyRequest);
};

module.exports.getTargetUrl = getTargetUrl;
module.exports.config = { api: { bodyParser: false } };
