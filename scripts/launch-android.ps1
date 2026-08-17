$ErrorActionPreference = 'Stop'
$pkg = 'com.bowvalleydev.topobuilder'

$serial = adb devices |
  Select-String '\tdevice$' |
  ForEach-Object { ($_ -split '\s+')[0] } |
  Select-Object -First 1

if (-not $serial) {
  throw 'No Android device is connected over adb.'
}

Write-Host "Using Android device $serial"
adb -s $serial reverse tcp:8081 tcp:8081
adb -s $serial reverse tcp:5173 tcp:5173
Write-Host 'Forwarded device localhost:8081 (Metro) and :5173 (Tabvar)'

$deadline = (Get-Date).AddMinutes(2)
$ok = $false
while (-not $ok -and (Get-Date) -lt $deadline) {
  try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect('127.0.0.1', 8081)
    $client.Close()
    $ok = $true
  } catch {
    Write-Host 'Waiting for Metro on port 8081...'
    Start-Sleep -Seconds 2
  }
}
if (-not $ok) {
  throw 'Metro is not listening on port 8081. Start Web first.'
}

$installed = ((adb -s $serial shell pm path $pkg 2>&1 | Out-String) -match 'package:')
if ($installed) {
  Write-Host 'App already installed; skipping native rebuild'
  adb -s $serial shell monkey -p $pkg -c android.intent.category.LAUNCHER 1
  exit 0
}

# Expo --device matches the adb model: name (Pixel_8), not the serial.
$detail = adb devices -l | Select-String ("^" + [regex]::Escape($serial) + '\s+')
$expoDevice = if ("$detail" -match 'model:(\S+)') { $Matches[1] } else { $null }

$env:ANDROID_SERIAL = $serial
if ($expoDevice) {
  Write-Host "Installing with Expo device name $expoDevice"
  npx expo run:android --no-bundler --device $expoDevice
} else {
  Write-Host 'Installing with Expo default device'
  npx expo run:android --no-bundler
}
