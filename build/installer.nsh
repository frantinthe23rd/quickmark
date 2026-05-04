; File association checkbox on the Finish page (appears after Directory selection).
; MUI2 calls DoFileAssoc when the user clicks Finish with the box checked.
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Associate .md and .markdown files with QuickMark"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION DoFileAssoc

Function DoFileAssoc
  WriteRegStr HKCU "Software\Classes\.md"       "" "QuickMarkFile"
  WriteRegStr HKCU "Software\Classes\.md"       "Content Type" "text/markdown"
  WriteRegStr HKCU "Software\Classes\.markdown" "" "QuickMarkFile"
  WriteRegStr HKCU "Software\Classes\QuickMarkFile"                    "" "Markdown File"
  WriteRegStr HKCU "Software\Classes\QuickMarkFile\DefaultIcon"        "" "$INSTDIR\QuickMark.exe,0"
  WriteRegStr HKCU "Software\Classes\QuickMarkFile\shell"              "" "open"
  WriteRegStr HKCU "Software\Classes\QuickMarkFile\shell\open\command" "" "$\"$INSTDIR\QuickMark.exe$\" $\"%1$\""
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
FunctionEnd

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\.md"
  DeleteRegKey HKCU "Software\Classes\.markdown"
  DeleteRegKey HKCU "Software\Classes\QuickMarkFile"
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
