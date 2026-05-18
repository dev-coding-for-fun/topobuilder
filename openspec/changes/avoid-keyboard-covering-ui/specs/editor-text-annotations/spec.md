## ADDED Requirements

### Requirement: Keyboard-Safe Text Editing
The editor SHALL keep the active text annotation editing control visible and usable when the on-screen keyboard is open.

#### Scenario: Focused label remains visible
- **WHEN** a text annotation is selected for editing and the on-screen keyboard opens
- **THEN** the editor keeps the focused text input within the visible area that is not covered by the keyboard

#### Scenario: Lower label remains editable
- **WHEN** the user edits a text annotation positioned near the lower portion of the photo
- **THEN** the keyboard does not cover the focused text input or prevent the user from seeing the text being typed

#### Scenario: Keyboard-time layout is transient
- **WHEN** the keyboard closes or the text edit is committed
- **THEN** the text annotation returns to its normal rendered position without changing its persisted anchor point, text content, font size, or colour

#### Scenario: Bottom controls do not obscure text entry
- **WHEN** the keyboard is open for text annotation editing
- **THEN** bottom editor controls do not overlap the focused text input or consume keyboard-safe editing space
