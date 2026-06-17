```markdown
# eaglestone-field-crm Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides guidance on contributing to the `eaglestone-field-crm` JavaScript codebase. It covers core coding conventions, file organization, and step-by-step workflows for UI theming and style revamps. The repository is a JavaScript project without a detected framework, focusing on modular, maintainable code and a consistent development process.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.js`, `taskManager.js`

### Imports
- Use **relative import paths**.
  - Example:
    ```javascript
    import { getUser } from './userService';
    ```

### Exports
- Prefer **named exports**.
  - Example:
    ```javascript
    // userService.js
    export function getUser(id) { /* ... */ }
    export function setUser(user) { /* ... */ }
    ```

### Commit Messages
- Freeform style, no strict prefixes.
- Average message length: ~56 characters.
  - Example:  
    ```
    Update task view to support new status colors
    ```

## Workflows

### UI Theme or Style Revamp in Isolated App
**Trigger:** When you need to update the visual style or user experience of the app to match branding or adopt a new UI framework, without affecting backend or other modules.  
**Command:** `/restyle-ui`

**Step-by-step:**
1. **Edit `public/index.html`:**  
   Adjust the HTML structure, update fonts, and modify layout containers as needed to support the new design.
   ```html
   <!-- Example: Update font and container -->
   <head>
     <link rel="stylesheet" href="styles.css">
     <style>body { font-family: 'Inter', sans-serif; }</style>
   </head>
   <body>
     <div class="main-container">...</div>
   </body>
   ```
2. **Edit `public/styles.css`:**  
   Update the color palette, fonts, shadows, border radii, and other design tokens to reflect the new style.
   ```css
   /* Example: New color palette and border radius */
   :root {
     --primary-color: #0057b8;
     --accent-color: #e8a317;
     --border-radius: 8px;
   }
   .button {
     background: var(--primary-color);
     border-radius: var(--border-radius);
   }
   ```
3. **Edit `public/app.js`:**  
   Restructure UI components, update action areas, and improve interactivity if required by the new design.
   ```javascript
   // Example: Update button rendering and event handling
   export function renderSaveButton(onClick) {
     const btn = document.createElement('button');
     btn.className = 'button';
     btn.textContent = 'Save';
     btn.onclick = onClick;
     return btn;
   }
   ```

**Files Involved:**
- `task-app/public/index.html`
- `task-app/public/styles.css`
- `task-app/public/app.js`

**Frequency:** ~1/month

## Testing Patterns

- **Test Framework:** Not explicitly detected.
- **Test File Pattern:** Files named with `.test.` in their filename.
  - Example: `userService.test.js`
- **General Approach:**  
  - Place tests alongside or near the code they cover.
  - Use descriptive test names and keep test logic modular.

## Commands

| Command      | Purpose                                                 |
|--------------|--------------------------------------------------------|
| /restyle-ui  | Revamp or restyle the UI in an isolated app module     |
```
