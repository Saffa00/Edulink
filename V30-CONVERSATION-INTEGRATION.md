# V30 — Conversation Center Integration

V30 connects secure conversation creation to the academic module workflow.

## Student
From a registered module, the student can use **Message Lecturer**.
The server derives the assigned lecturer and creates/reuses the secure conversation.

## Lecturer
Lecturers can load all their conversations through:
`GET /api/conversations/lecturer`

The UI groups conversations by module and shows the Student ID and name.

## Added
- `src/services/conversationCenter.js`
- `src/components/ModuleConversationButton.jsx`
- `src/components/LecturerConversationList.jsx`
- `src/v30-conversations.css`
- lecturer conversation API
- module-grouped lecturer conversation list

## Security
Conversation creation still occurs on the trusted server. The frontend cannot choose an arbitrary lecturer.

## Integration
Render `ModuleConversationButton` beside each student's registered module.
Render `LecturerConversationList` in the lecturer Messages area and open the selected conversation with the existing V25/V26 chat component.
