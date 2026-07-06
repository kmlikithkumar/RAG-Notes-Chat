$base = "http://127.0.0.1:5050/api"
Write-Output "TEST: Unauthenticated GET /api/documents"
try {
  $r = Invoke-RestMethod -Uri "$base/documents" -Method Get -ErrorAction Stop
  Write-Output "Unexpected success:"; Write-Output $r
} catch {
  Write-Output "Expected failure:"; Write-Output $_.Exception.Response.StatusCode.value__
}

Write-Output "TEST: signup userA"
$tokA = (Invoke-RestMethod -Uri "$base/auth/signup" -Method Post -Body (@{email='userA@example.com'; password='pass'} | ConvertTo-Json) -ContentType 'application/json').token
Write-Output "tokA: $tokA"

Write-Output "TEST: signup userB"
$tokB = (Invoke-RestMethod -Uri "$base/auth/signup" -Method Post -Body (@{email='userB@example.com'; password='pass'} | ConvertTo-Json) -ContentType 'application/json').token
Write-Output "tokB: $tokB"

$testFile = Join-Path $PSScriptRoot 'test_upload.txt'
Set-Content -Path $testFile -Value 'This is a secret doc for user A.' -Encoding UTF8

Write-Output "TEST: upload with userA"
$uploadResp = Invoke-RestMethod -Uri "$base/upload" -Method Post -Headers @{Authorization="Bearer $tokA"} -Form @{file = Get-Item $testFile}
Write-Output "Upload response: $uploadResp"
$docId = $uploadResp.docId
Write-Output "Uploaded docId: $docId"

Write-Output "TEST: userB preview access (should fail)"
try {
  $r = Invoke-RestMethod -Uri "$base/documents/$docId/preview" -Method Get -Headers @{Authorization = "Bearer $tokB"} -ErrorAction Stop
  Write-Output "Unexpected success:"; Write-Output $r
} catch {
  Write-Output "Expected failure status code:"; Write-Output $_.Exception.Response.StatusCode.value__
}

Remove-Item $testFile -ErrorAction SilentlyContinue
Write-Output "TESTS COMPLETE"
