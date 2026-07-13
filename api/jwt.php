<?php
// JWT HS256 en PHP puro (sin dependencias / sin Composer).

function b64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode($data)
{
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_sign(array $payload, $secret)
{
    $header = b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body   = b64url_encode(json_encode($payload));
    $sig    = b64url_encode(hash_hmac('sha256', "$header.$body", $secret, true));
    return "$header.$body.$sig";
}

function jwt_verify($token, $secret)
{
    $parts = explode('.', (string) $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$header, $body, $sig] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "$header.$body", $secret, true));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $payload = json_decode(b64url_decode($body), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && time() >= $payload['exp']) {
        return null;
    }
    return $payload;
}
