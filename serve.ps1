$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $baseDir 'data'
$leadsFile = Join-Path $dataDir 'leads.jsonl'

if (-not (Test-Path $dataDir)) {
    New-Item -Path $dataDir -ItemType Directory | Out-Null
}

if (-not (Test-Path $leadsFile)) {
    New-Item -Path $leadsFile -ItemType File | Out-Null
}

function Get-ContentType([string]$ext) {
    switch ($ext.ToLowerInvariant()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.css' { return 'text/css; charset=utf-8' }
        '.js' { return 'application/javascript; charset=utf-8' }
        '.json' { return 'application/json; charset=utf-8' }
        '.svg' { return 'image/svg+xml' }
        '.png' { return 'image/png' }
        '.ico' { return 'image/x-icon' }
        '.txt' { return 'text/plain; charset=utf-8' }
        '.webp' { return 'image/webp' }
        default { return 'application/octet-stream' }
    }
}

function Write-JsonResponse($response, [int]$statusCode, $payload) {
    $json = $payload | ConvertTo-Json -Depth 8 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

    $response.StatusCode = $statusCode
    $response.ContentType = 'application/json; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Add-CorsHeaders($response) {
    $response.Headers['Access-Control-Allow-Origin'] = '*'
    $response.Headers['Access-Control-Allow-Methods'] = 'GET, HEAD, POST, OPTIONS'
    $response.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
}

function Read-JsonBody($request) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    try {
        $raw = $reader.ReadToEnd()
    } finally {
        $reader.Dispose()
    }

    if ([string]::IsNullOrWhiteSpace($raw)) {
        return $null
    }

    try {
        return $raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        return $null
    }
}

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add('http://localhost:8765/')
    $listener.Start()
} catch {
    Write-Host "Failed to start local server: $($_.Exception.Message)"
    Write-Host 'Use the Node backend server instead: node server.js'
    return
}

Write-Host 'SecureAnno server running on http://localhost:8765/'

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            Add-CorsHeaders $response

            $requestPath = $request.Url.AbsolutePath
            $method = $request.HttpMethod.ToUpperInvariant()

            if ($method -eq 'OPTIONS') {
                $response.StatusCode = 204
                $response.Close()
                continue
            }

            if ($method -eq 'POST' -and $requestPath -eq '/api/contact') {
                $body = Read-JsonBody $request
                if ($null -eq $body) {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Invalid JSON payload.' }
                    $response.Close()
                    continue
                }

                $website = [string]($body.website)
                if (-not [string]::IsNullOrWhiteSpace($website)) {
                    Write-JsonResponse $response 200 @{ ok = $true; message = 'Thanks. We will be in touch soon.' }
                    $response.Close()
                    continue
                }

                $fullName = [string]($body.fullName)
                $email = [string]($body.email)
                $company = [string]($body.company)
                $serviceInterest = [string]($body.serviceInterest)
                $projectDetails = [string]($body.projectDetails)

                if ($fullName.Trim().Length -lt 2) {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Please enter a valid full name.' }
                    $response.Close()
                    continue
                }

                if ($email.Trim().Length -lt 5 -or $email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Please enter a valid work email.' }
                    $response.Close()
                    continue
                }

                if ($company.Trim().Length -lt 2) {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Please enter a valid company name.' }
                    $response.Close()
                    continue
                }

                if ([string]::IsNullOrWhiteSpace($serviceInterest)) {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Please select a service interest.' }
                    $response.Close()
                    continue
                }

                if ($projectDetails.Length -gt 4000) {
                    Write-JsonResponse $response 400 @{ ok = $false; message = 'Project details are too long.' }
                    $response.Close()
                    continue
                }

                $lead = [ordered]@{
                    id = [Guid]::NewGuid().ToString()
                    receivedAt = [DateTime]::UtcNow.ToString('o')
                    ip = [string]($request.RemoteEndPoint.Address)
                    fullName = $fullName.Trim()
                    email = $email.Trim().ToLowerInvariant()
                    phone = [string]($body.phone).Trim()
                    company = $company.Trim()
                    jobTitle = [string]($body.jobTitle).Trim()
                    country = [string]($body.country).Trim()
                    companySize = [string]($body.companySize).Trim()
                    serviceInterest = $serviceInterest.Trim()
                    dataVolume = [string]($body.dataVolume).Trim()
                    projectDetails = $projectDetails.Trim()
                    website = ''
                }

                $line = ($lead | ConvertTo-Json -Depth 8 -Compress) + [Environment]::NewLine
                [System.IO.File]::AppendAllText($leadsFile, $line, [System.Text.Encoding]::UTF8)

                Write-JsonResponse $response 200 @{
                    ok = $true
                    message = 'Inquiry received successfully.'
                    notifications = @{
                        emailConfigured = $false
                        emailDelivered = $false
                        whatsappConfigured = $false
                        whatsappDelivered = $false
                    }
                }
                $response.Close()
                continue
            }

            if ($requestPath -eq '/') {
                $requestPath = '/index.html'
            }

            $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $candidatePath = Join-Path $baseDir $relativePath
            $resolvedPath = [System.IO.Path]::GetFullPath($candidatePath)
            $resolvedBase = [System.IO.Path]::GetFullPath($baseDir)

            if (-not $resolvedPath.StartsWith($resolvedBase, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                $response.Close()
                continue
            }

            if (Test-Path $resolvedPath -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($resolvedPath)
                $response.ContentType = Get-ContentType ([System.IO.Path]::GetExtension($resolvedPath))
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
                $response.Close()
                continue
            }

            $response.StatusCode = 404
            $response.Close()
        } catch {
            Write-Host "Request handling error: $($_.Exception.Message)"
            if (-not $response.OutputStream.CanWrite) {
                $response.Close()
                continue
            }

            Write-JsonResponse $response 500 @{ ok = $false; message = 'Internal server error.' }
            $response.Close()
        }
    }
} finally {
    if ($null -ne $listener) {
        $listener.Stop()
        $listener.Close()
    }
}
