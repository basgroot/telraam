<?php

// Add for debugging:
error_reporting(E_ALL);
ini_set('display_errors', 1);

function throwErrorAndDie($error, $returnCode) {
    http_response_code($returnCode);
    die('{"code":'.$returnCode.',"reason":"'.$error.'","message":"'.$error.'"}');
}

/**
 * Initiate cURL.
 * @param string $url The endpoint to call.
 * @return object
 */
function configureCurl($url, $apiKey) {
    error_log('Connecting to ' . $url);
    $payload = file_get_contents('php://input');
    $ch = curl_init($url);
    // https://www.php.net/manual/en/function.curl-setopt.php
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => array(
            'Accept: application/json',
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
            'X-Api-Key: '.$apiKey
        ),
        CURLOPT_FAILONERROR    => false,  // Required for HTTP error codes to be reported via call to curl_error($ch)
        CURLOPT_SSL_VERIFYPEER => true,  // false to stop cURL from verifying the peer's certificate.
        CURLOPT_CAINFO         => __DIR__ . '/cacert-2025-02-25.pem',  // This Mozilla CA certificate store was generated at This bundle was generated at Tue Feb 25 04:12:03 2025 GMT and is downloaded from https://curl.haxx.se/docs/caextract.html
        CURLOPT_SSL_VERIFYHOST => 2,  // 2 to verify that a Common Name field or a Subject Alternate Name field in the SSL peer certificate matches the provided hostname.
        CURLOPT_FOLLOWLOCATION => false,  // true to follow any "Location: " header that the server sends as part of the HTTP header.
        CURLOPT_RETURNTRANSFER => true,  // true to return the transfer as a string of the return value of curl_exec() instead of outputting it directly.
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',  // Act as web browser
        CURLOPT_CUSTOMREQUEST  => 'POST',  // A custom request method to use instead of "GET" or "HEAD" when doing a HTTP request. This is useful for doing "DELETE" or other, more obscure HTTP requests. Valid values are things like "GET", "POST", "CONNECT" and so on; i.e.
        CURLOPT_HEADER         => true,  // true to include the header in the output.
        CURLOPT_ENCODING       => 'gzip'  // This enables decoding of the response. Supported encodings are "identity", "deflate", and "gzip". If an empty string is set, a header containing all supported encoding types is sent.
    ]);
    if (defined('CURL_VERSION_HTTP2') && (curl_version()['features'] & CURL_VERSION_HTTP2) !== 0) {
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_VERSION_HTTP2);  // CURL_HTTP_VERSION_2_0 (attempt to use HTTP 2, when available)
    }
    if ($payload) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);  // Just pass through the data
    }
    return $ch;
}

header('Access-Control-Allow-Credentials: true');

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header('Access-Control-Allow-Methods: POST, OPTIONS');
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header('Access-Control-Allow-Headers: ' . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']);
    }
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    }
    header('Access-Control-Max-Age: 86400');  // Cache for 1 day
    die();  // Don't do anything else
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    throwErrorAndDie('Method Not Allowed', 405);
}

header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);

// Check if cURL is installed
if (!function_exists('curl_init')){
    throwErrorAndDie('cURL is not installed for this PHP installation.', 500);
}

$apiKey = $_SERVER['HTTP_X_API_KEY'];
$path = filter_input(INPUT_GET, 'path', FILTER_DEFAULT);
$url = 'https://telraam-api.net/' . $path;

// Create cURL handle
$ch = configureCurl($url, $apiKey);
// Execute request:
$response = curl_exec($ch);
if ($response === false) {
    // Something bad happened (couldn't reach the server). No internet connection?
    throwErrorAndDie('Error connecting to POST ' . $url . ': ' . curl_error($ch), 400);
}
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);  // As of cURL 7.10.8, this is a legacy alias of CURLINFO_RESPONSE_CODE
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);
// Separate response header from response
$headers = explode("\n", substr($response, 0, $header_size));
$body = substr($response, $header_size);
if ($body === '') {
    if ($httpCode < 200 || $httpCode >= 300) {
        // Don't quit immediately. Construct a valid error and continue.
        throwErrorAndDie(trim($headers[0]), $httpCode);
    } else {
        // No response body, but response code indicates success https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#successful_responses
    }
} else {
    http_response_code($httpCode);
    echo $body;
}
