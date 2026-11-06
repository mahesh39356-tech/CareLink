Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$outDir = "C:\Users\VICKY\.gemini\antigravity\scratch\carelink-telemedicine-app\backend\storage\original\audio"
$outFile = Join-Path $outDir "human_speech_amina.wav"
$synth.SetOutputToWaveFile($outFile)
$synth.Speak("Hello Doctor. This is Amina Mwangi. I have had a high fever for three days, severe pain when swallowing, and difficulty eating. Please review my clinical images and provide advice.")
$synth.Dispose()
Write-Host "Real speech audio file created successfully. Size in bytes:" (Get-Item $outFile).Length
