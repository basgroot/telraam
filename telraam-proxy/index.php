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
function configureCurl($url) {
    error_log('Connecting to ' . $url);
    $ch = curl_init($url);
    // https://www.php.net/manual/en/function.curl-setopt.php
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => array(
            'Accept: application/json'
        ),
        CURLOPT_FAILONERROR    => false,  // Required for HTTP error codes to be reported via call to curl_error($ch)
        CURLOPT_SSL_VERIFYPEER => true,  // false to stop cURL from verifying the peer's certificate.
        CURLOPT_CAINFO         => __DIR__ . '/cacert-2025-12-02.pem',  // This Mozilla CA certificate store downloaded from https://curl.haxx.se/docs/caextract.html
        CURLOPT_SSL_VERIFYHOST => 2,  // 2 to verify that a Common Name field or a Subject Alternate Name field in the SSL peer certificate matches the provided hostname.
        CURLOPT_FOLLOWLOCATION => false,  // true to follow any "Location: " header that the server sends as part of the HTTP header.
        CURLOPT_RETURNTRANSFER => true,  // true to return the transfer as a string of the return value of curl_exec() instead of outputting it directly.
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',  // Act as web browser
        CURLOPT_CUSTOMREQUEST  => 'GET',  // A custom request method to use instead of "GET" or "HEAD" when doing a HTTP request. This is useful for doing "DELETE" or other, more obscure HTTP requests. Valid values are things like "GET", "POST", "CONNECT" and so on; i.e.
        CURLOPT_HEADER         => true,  // true to include the header in the output.
        CURLOPT_ENCODING       => 'gzip'  // This enables decoding of the response. Supported encodings are "identity", "deflate", and "gzip". If an empty string is set, a header containing all supported encoding types is sent.
    ]);
    if (defined('CURL_VERSION_HTTP2') && (curl_version()['features'] & CURL_VERSION_HTTP2) !== 0) {
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_VERSION_HTTP2);  // CURL_HTTP_VERSION_2_0 (attempt to use HTTP 2, when available)
    }
    return $ch;
}

header('Access-Control-Allow-Credentials: true');

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header('Access-Control-Allow-Methods: GET, OPTIONS');
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

if ($_SERVER['REQUEST_METHOD'] != 'GET') {
    throwErrorAndDie('Method Not Allowed', 405);
}

header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);

// Check if cURL is installed
if (!function_exists('curl_init')){
    throwErrorAndDie('cURL is not installed for this PHP installation.', 500);
}

$id = filter_input(INPUT_GET, 'id', FILTER_DEFAULT);
$dateStart = filter_input(INPUT_GET, 'dateStart', FILTER_DEFAULT);
$dateEnd = filter_input(INPUT_GET, 'dateEnd', FILTER_DEFAULT);

// Validate input parameters
if (empty($id) || !preg_match('/^\d+$/', $id)) {
    throwErrorAndDie('Invalid or missing id parameter. Must be a numeric segment ID.', 400);
}
if (empty($dateStart) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStart)) {
    throwErrorAndDie('Invalid or missing dateStart parameter. Must be in YYYY-MM-DD format.', 400);
}
if (empty($dateEnd) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateEnd)) {
    throwErrorAndDie('Invalid or missing dateEnd parameter. Must be in YYYY-MM-DD format.', 400);
}

$url = 'https://telraam.net/api/measurements-day-barchart/segments/'.$id.'/'.$dateStart.'/'.$dateEnd;

// Create cURL handle
$ch = configureCurl($url);
// Execute request:
$response = curl_exec($ch);
if ($response === false) {
    // Something bad happened (couldn't reach the server). No internet connection?
    throwErrorAndDie('Error connecting to GET ' . $url . ': ' . curl_error($ch), 400);
}
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);  // As of cURL 7.10.8, this is a legacy alias of CURLINFO_RESPONSE_CODE
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

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
