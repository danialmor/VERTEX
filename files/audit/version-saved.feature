Feature: Audit a drawing version saved by another user

  Scenario: An Isfahan colleague edits and saves Aqeeq 3 drawing S-104
    Given Danial uploaded version 7 of drawing "S-104" in project "Aqeeq 3"
    And the Isfahan colleague is signed in with their own account and has edit access
    When the colleague opens version 7 and saves changed content
    Then the server stores version 8 with version 7 as its base
    And the audit timeline records one successful version-save event attributed to the colleague
    And that event identifies the project, drawing, base version, new version, and server UTC time
    And an authorized user can still download the original bytes of version 7
