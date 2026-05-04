; Custom NSIS installer page — file association opt-in
!include LogicLib.nsh
!include nsDialogs.nsh

Var CB_FileAssoc
Var FileAssocState

Function FileAssocPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Select which file types QuickMark should open by default:"
  Pop $0

  ${NSD_CreateCheckbox} 0 36u 100% 13u ".md and .markdown -- Markdown files"
  Pop $CB_FileAssoc
  ${NSD_SetState} $CB_FileAssoc ${BST_CHECKED}

  nsDialogs::Show
FunctionEnd

Function FileAssocPageLeave
  ${NSD_GetState} $CB_FileAssoc $FileAssocState
FunctionEnd

Page custom FileAssocPage FileAssocPageLeave

!macro customInstall
  ; Default to checked for silent / automated installs (page not shown)
  ${If} $FileAssocState == ""
    StrCpy $FileAssocState 1
  ${EndIf}

  ${If} $FileAssocState == 1
    WriteRegStr HKCU "Software\Classes\.md"       "" "QuickMarkFile"
    WriteRegStr HKCU "Software\Classes\.md"       "Content Type" "text/markdown"
    WriteRegStr HKCU "Software\Classes\.markdown" "" "QuickMarkFile"

    WriteRegStr HKCU "Software\Classes\QuickMarkFile"                    "" "Markdown File"
    WriteRegStr HKCU "Software\Classes\QuickMarkFile\DefaultIcon"        "" "$INSTDIR\QuickMark.exe,0"
    WriteRegStr HKCU "Software\Classes\QuickMarkFile\shell"              "" "open"
    WriteRegStr HKCU "Software\Classes\QuickMarkFile\shell\open\command" "" "$\"$INSTDIR\QuickMark.exe$\" $\"%1$\""

    ; Notify shell so Explorer picks up the new association immediately
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\.md"
  DeleteRegKey HKCU "Software\Classes\.markdown"
  DeleteRegKey HKCU "Software\Classes\QuickMarkFile"
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend
