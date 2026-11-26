try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $inPath = 'C:\Users\Swati\.gemini\antigravity\scratch\dhwanifleet-voice-ai\ChalaakSaathi_Idea_Submission_Deck.pptx'
  $outPath = 'C:\Users\Swati\Downloads\ChalaakSaathi_Official_Submission.pdf'
  
  # Remove existing output if present
  if (Test-Path $outPath) {
    Remove-Item $outPath -Force
  }

  $presentation = $ppt.Presentations.Open($inPath, 2, 0, 0)
  $presentation.SaveAs($outPath, 32)
  $presentation.Close()
  $ppt.Quit()
  
  Write-Host "SUCCESS: Exported native PowerPoint PDF to $outPath"
  Get-Item $outPath | Select-Object Name, Length, LastWriteTime
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
