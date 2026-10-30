Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

exePath = currentDir & "\DocTrack-LGU.exe"
if fso.FileExists(exePath) Then
    WshShell.Run Chr(34) & exePath & Chr(34), 0, False
Else
    batPath = currentDir & "\DocTrack-LGU.bat"
    WshShell.Run Chr(34) & batPath & Chr(34), 0, False
End If
Set WshShell = Nothing
Set fso = Nothing
