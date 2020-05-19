#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
#NoTrayIcon
; #InstallKeybdHook
; #InstallMouseHook
#Persistent
#SingleInstance Force

SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

$F6 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "Previous" WebNowPlayingExample][!Update]
$F7 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "PlayPause" WebNowPlayingExample][!Update]
$F8 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "Next" WebNowPlayingExample][!Update]
$F9 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasureRepeat "Repeat" WebNowPlayingExample][!Update]
$^+F8 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "SetPosition +2" WebNowPlayingExample][!Update]
$^+F6 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "SetPosition -2" WebNowPlayingExample][!Update]
$^F8 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "SetPosition +0.4" WebNowPlayingExample][!Update]
$^F6 UP::Run "C:\Program Files\Rainmeter\Rainmeter.exe" [!CommandMeasure MeasurePlayPause "SetPosition -0.4" WebNowPlayingExample][!Update]