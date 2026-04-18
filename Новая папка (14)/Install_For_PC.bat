@echo off
set "TargetPath=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "AppUrl=file:///%~dp0frontend\index.html"
set "ShortcutName=EduLingo App.lnk"
set "DesktopDir=%USERPROFILE%\Desktop"

if exist "%TargetPath%" (
    echo Creating shortcut for Chrome...
    powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%DesktopDir%\%ShortcutName%'); $shortcut.TargetPath = '%TargetPath%'; $shortcut.Arguments = '--app=\"%AppUrl%\"'; $shortcut.Save()"
    echo Shortcut created on your Desktop! Look for "EduLingo App".
) else (
    echo Chrome not found in default directory, trying Edge...
    set "TargetPathEdge=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if exist "%TargetPathEdge%" (
        powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%DesktopDir%\%ShortcutName%'); $shortcut.TargetPath = '%TargetPathEdge%'; $shortcut.Arguments = '--app=\"%AppUrl%\"'; $shortcut.Save()"
        echo Shortcut created on your Desktop! Look for "EduLingo App".
    ) else (
        echo Could not find Chrome or Edge automatically.
    )
)
pause
