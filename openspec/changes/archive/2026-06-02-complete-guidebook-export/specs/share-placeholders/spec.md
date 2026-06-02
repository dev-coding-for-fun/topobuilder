## MODIFIED Requirements

### Requirement: Share Placeholder Sheet
Tapping any share affordance SHALL open the same share bottom sheet. The sheet SHALL display copy identifying the scope being shared (Crag name, Sector name, or Topo name), retain placeholder connected-service rows when no services are connected, expose PDF export for that scope, and provide a "Close" action that dismisses the sheet.

#### Scenario: Share sheet shows the scope
- **WHEN** the user taps the share affordance on a Topo row named "Black Hole"
- **THEN** the share sheet displays text identifying "Black Hole" as the scope

#### Scenario: Share sheet dismisses cleanly
- **WHEN** the user taps "Close" on the share sheet
- **THEN** the sheet dismisses without changing app data

#### Scenario: Supported export action can generate a file
- **WHEN** the user taps the PDF export option in the share sheet
- **THEN** the system generates a PDF file for the selected share scope

#### Scenario: Future export formats remain disabled
- **WHEN** an export format other than PDF is not implemented
- **THEN** the corresponding export option is disabled and explains why it is unavailable

#### Scenario: Export errors stay in the sheet
- **WHEN** PDF generation or sharing fails
- **THEN** the share sheet displays the error without dismissing automatically
