# PROJECT: HIDDEN PEAK DINING
## Restaurant Operations, Team Communication & Inventory Management Platform

Act as a senior full-stack software architect, mobile application engineer, UI/UX designer, database architect, and DevOps engineer.

Your task is to design and develop a production-grade, cross-platform restaurant operations application for **Hidden Peak Dining**.

This must be a fully functional application, not a static prototype or a collection of mockup screens.

The application will eventually be deployed on AWS using a microservices architecture. For this development phase, build the complete frontend, backend services, API contracts, database schemas, authentication, authorization, and real-time communication infrastructure.

Do not implement AWS infrastructure or deployment pipelines yet. However, architect everything so it can be deployed to AWS without major architectural changes.

---

# 1. PRODUCT VISION

Create a centralized restaurant operations platform that allows employees and managers across different departments to:

- Communicate with their respective teams.
- Receive important operational announcements and notifications.
- Manage and monitor inventory.
- Add, remove, edit, and adjust inventory items.
- See inventory changes in real time.
- Coordinate daily restaurant operations.
- Manage employees and team assignments.
- Share important information between departments.

The experience should feel like a premium, professionally designed iOS application while supporting both Apple iOS and Android.

The application name is:

**Hidden Peak Dining**

The product should prioritize speed, simplicity, reliability, and usability in a busy restaurant environment.

# 2. TECHNOLOGY STACK

Use the following architecture and technologies unless a strong technical reason requires an alternative.

## Frontend

- React Native.
- Expo with TypeScript.
- Expo Router for navigation.
- NativeWind or a consistent React Native styling system.
- TanStack Query for server state.
- Zustand for lightweight client-side state.
- React Hook Form with Zod validation.
- WebSocket client for real-time functionality.
- Expo Notifications for push notifications.
- Secure token storage using Expo SecureStore.

The application must support:
- iOS.
- Android.
- Different screen sizes.
- Portrait-first mobile layouts.
- Native-feeling navigation and interactions.

Avoid building a web application disguised as a mobile application.

## Backend

Use:
- Node.js.
- TypeScript.
- NestJS.
- REST APIs.
- WebSockets using Socket.IO.
- Redis for caching, event distribution, and real-time coordination.
- JWT authentication with refresh-token rotation.
- Role-based access control.

Structure backend functionality into independently deployable microservices.

## Database

Use PostgreSQL as the primary relational database.

Use Prisma ORM for database access, migrations, and schema management.

Use Redis for:
- Real-time event distribution.
- Caching.
- Online presence.
- Temporary session data.
- WebSocket scaling.

Inventory and messaging must persist in PostgreSQL. Redis must not be the source of truth for business data.

---

# 3. BRANDING AND DESIGN SYSTEM

Create a premium, professional restaurant operations interface.

## Color palette

Primary olive green: #596B3D

Dark olive: #35452B

Light olive: #E8EDDF

Background: #F8F9F5

White: #FFFFFF

Primary text: #20251D

Secondary text: #73796D

Borders: #E4E8DF

Error: #C74747

Success: #43865A

Use olive green strategically for:
- Primary buttons.
- Navigation highlights.
- Active states.
- Important indicators.
- Inventory status indicators.
- Branding elements.

Use white and light neutral backgrounds for most surfaces.

## Design philosophy

The application should resemble a premium, professionally designed iOS productivity application.

Design characteristics:
- Clean and minimal.
- Generous spacing.
- Rounded cards.
- Subtle shadows.
- Excellent typography.
- Consistent iconography.
- Smooth transitions.
- Responsive layouts.
- Clear visual hierarchy.
- Minimal clutter.

Use native-feeling bottom tab navigation.

Implement light mode as the primary experience.

Every screen must have consistent spacing, typography, buttons, cards, inputs, and interaction patterns.

Avoid excessive gradients, unnecessary animations, and oversized dashboard elements.

The application must be easy to operate with one hand during a busy restaurant shift.

---

# 4. USER ROLES AND PERMISSIONS

Implement role-based access control.

There are three primary roles:

## Employee

Employees can:
- View their assigned teams.
- Participate in team message boards.
- Create messages.
- Reply to messages.
- Receive notifications.
- View inventory accessible to their teams.
- Create inventory items if permitted by the applicable team policy.
- Edit inventory items.
- Delete inventory items if permitted.
- Increase or decrease inventory quantities.
- View inventory activity history.

## Manager

Managers can:
- Access all employee functionality.
- Create new teams.
- Edit team names and descriptions.
- Delete teams.
- Assign employees to teams.
- Remove employees from teams.
- Create announcements.
- Moderate team message boards.
- Manage inventory across their authorized teams.
- Review inventory activity.
- Manage team permissions.
- View operational activity logs.

## Administrator

Administrators have full system access.

They can:
- Create, deactivate, and manage employee accounts.
- Assign and remove managers.
- Create, edit, and delete teams.
- Manage global permissions.
- Access all team message boards.
- Access all inventory.
- Configure application-wide settings.
- Review audit logs.

Managers should not automatically receive administrator privileges.

Implement backend authorization checks. Never rely exclusively on hiding frontend buttons.

---

# 5. INITIAL TEAM STRUCTURE

Create three default teams during database seeding.

1. Front of House
2. Deli
3. Private Dining

Each team must have:

- Unique team ID.
- Team name.
- Description.
- Assigned employees.
- Assigned managers.
- Team message board.
- Team inventory access.
- Team-specific notification settings.
- Creation timestamp.
- Updated timestamp.

Administrators and authorized managers must be able to create additional teams at any time.

Teams must not be hardcoded into the frontend.

The application must dynamically retrieve available teams from the backend.

Employees can belong to multiple teams.

A manager may manage multiple teams.

When a team is deleted, use safe deletion or archival rules. Never silently delete historical messages or inventory transaction records.

---

# 6. MAIN APPLICATION NAVIGATION

Create five primary navigation destinations:

1. Home
2. Messages
3. Inventory
4. Teams
5. Profile

Use a clean bottom navigation bar.

## Home dashboard

The home screen should provide a quick overview of restaurant operations.

Display:

- Welcome message.
- Employee's assigned teams.
- Unread message count.
- Recent announcements.
- Recent inventory activity.
- Low-stock inventory alerts.
- Quick inventory adjustment action.
- Quick message creation action.

Managers should see additional operational information:

- Total employees.
- Total teams.
- Inventory alerts.
- Recent team activity.
- Pending operational announcements.

Keep the home screen concise and actionable.

Do not overload the dashboard with unnecessary charts.

---

# 7. TEAM COMMUNICATION SYSTEM

Each team must have its own dedicated message board.

Examples:

Front of House message board.

Deli message board.

Private Dining message board.

The system should support:

## Messaging functionality

- Create messages.
- Reply to messages.
- Edit own messages.
- Delete own messages, subject to permissions.
- Pin important messages.
- Create manager announcements.
- Display sender name and profile picture.
- Display message timestamps.
- Display edited indicators.
- Support message read status.
- Display unread message counts.
- Support message reactions.
- Support basic text formatting.

## Message categories

Allow messages to be categorized as:

- General.
- Announcement.
- Urgent.
- Shift Update.
- Inventory Update.

Use visually distinct indicators for urgent messages and manager announcements.

## Real-time messaging

Use WebSockets.

When an employee creates a message:
1. Save the message to PostgreSQL.
2. Publish a message-created event.
3. Broadcast the event to connected members of the relevant team.
4. Update the message board immediately.
5. Update unread message counts.
6. Trigger push notifications for eligible offline users.

Messages must persist even when users disconnect.

Implement pagination or cursor-based loading for message history.

Do not load an entire message history every time a user opens a board.

---

# 8. REAL-TIME NOTIFICATION SYSTEM

Implement an application-wide notification system.

Notifications should include:

- New team messages.
- New announcements.
- Urgent announcements.
- Inventory changes.
- Low-stock alerts.
- Employee team assignments.
- Team membership changes.

Users should be able to:
- View notifications.
- Mark notifications as read.
- Mark all notifications as read.
- Open the related team or inventory item.
- Configure notification preferences.

Use:
- In-app notifications.
- WebSocket updates.
- Mobile push notifications through Expo Notifications.

Notification delivery should respect team membership and individual notification preferences.

---

# 9. INVENTORY MANAGEMENT SYSTEM

This is one of the application's most important features.

Build a fully functional inventory management module accessible from the main navigation.

Inventory must be manageable by authorized employees and managers across all teams.

## Inventory item structure

Each inventory item should support:

- Item ID.
- Item name.
- Description.
- Category.
- Team ownership or team associations.
- Unit of measurement.
- Quantity.
- Minimum stock threshold.
- Optional SKU.
- Optional supplier.
- Optional cost per unit.
- Created by.
- Last modified by.
- Created timestamp.
- Updated timestamp.
- Archived/deleted status.

Examples of units:
- Each.
- Cases.
- Boxes.
- Pounds.
- Ounces.
- Gallons.
- Liters.
- Bottles.
- Packs.

Quantity must support decimal values where appropriate.

## Inventory functionality

Users with appropriate permissions must be able to:

1. Create a new inventory item.
2. Edit an existing item.
3. Delete or archive an item.
4. Increase item quantity.
5. Decrease item quantity.
6. Set an exact quantity.
7. View current quantity.
8. View inventory history.
9. Search for items.
10. Filter by team.
11. Filter by category.
12. Identify low-stock items.

## Optional quantities

An important requirement:

**Users must be able to create inventory items without entering a quantity.**

Quantity must be optional during item creation.

If no quantity is provided, store it as NULL rather than automatically assuming zero.

Clearly display an unset quantity as "Not Counted" or "Not Set".

Users should be able to add a quantity later.

Do not confuse an unset quantity with zero inventory.

## Quantity adjustment experience

Make quantity adjustment exceptionally fast.

When a user selects an inventory item, display:

- Item name.
- Current quantity.
- Unit.
- Increase button.
- Decrease button.
- Manual quantity entry.
- Optional adjustment note.
- Save action.

Support quick adjustment buttons such as:

+1
+5
+10

Allow custom amounts.

For example:

If the item has 20 cases:
- Increase by 5 = 25.
- Decrease by 3 = 22.
- Set exact quantity = 15.

Prevent negative inventory unless an authorized manager explicitly permits it.

## Inventory team organization

Inventory should be organized by team.

Examples:

Front of House Inventory.

Deli Inventory.

Private Dining Inventory.

Also provide an optional all-teams inventory view for authorized users.

Allow an item to be associated with multiple teams if appropriate.

## Inventory history

Every inventory modification must generate a permanent transaction record.

Record:
- Item.
- Previous quantity.
- New quantity.
- Adjustment amount.
- Adjustment type.
- User who performed the action.
- Team.
- Timestamp.
- Optional notes.

Adjustment types:
- Addition.
- Removal.
- Manual correction.
- Initial count.
- Item created.
- Item archived.

Do not overwrite historical transactions.

## Real-time synchronization

This is a critical requirement.

If an employee in Deli changes an inventory item, other employees authorized to view that inventory must see the change immediately without refreshing the application.

Implement:

- WebSocket events.
- Optimistic UI updates.
- Server confirmation.
- Conflict handling.
- Reconnection logic.
- Event deduplication.
- Transaction-safe database updates.

Use PostgreSQL transactions to prevent concurrent inventory updates from producing incorrect quantities.

For quantity adjustments, use atomic database operations or row-level locking.

Do not rely on client-side calculations as the final source of truth.

When two employees adjust the same item simultaneously, both adjustments must be accounted for correctly.

---

# 10. SEARCH AND FILTERING

Implement global search where appropriate.

Users should be able to search:

- Inventory items.
- Teams.
- Team messages.
- Employees, subject to permissions.

Inventory filters:
- Team.
- Category.
- Low stock.
- Uncounted items.
- Recently modified.

Message filters:
- Team.
- Announcement.
- Urgent.
- Unread.

Search must be fast and responsive.

Use backend pagination and database indexes.

---

# 11. PROFILE AND EMPLOYEE MANAGEMENT

Create an employee profile system.

Employee profiles should include:

- Profile picture.
- Full name.
- Email.
- Role.
- Assigned teams.
- Account status.
- Notification preferences.
- Last active timestamp.

Employees should be able to:
- Edit permitted profile information.
- Change notification preferences.
- Update profile pictures.
- Change passwords.
- View their assigned teams.

Managers should be able to assign and remove employees from teams.

Administrators should be able to create, suspend, deactivate, and reactivate employee accounts.

Never permanently delete employee records if doing so would damage historical audit records.

---

# 12. DATABASE ARCHITECTURE

Design a normalized PostgreSQL database.

Create the following core tables, adding supporting tables where needed.

## users
- id UUID PRIMARY KEY
- full_name VARCHAR
- email VARCHAR UNIQUE
- password_hash VARCHAR
- profile_image_url TEXT NULL
- role ENUM
- account_status ENUM
- created_at TIMESTAMP
- updated_at TIMESTAMP

## teams
- id UUID PRIMARY KEY
- name VARCHAR UNIQUE
- description TEXT
- is_active BOOLEAN
- created_by UUID REFERENCES users(id)
- created_at TIMESTAMP
- updated_at TIMESTAMP

## team_memberships
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- team_id UUID REFERENCES teams(id)
- membership_role ENUM
- joined_at TIMESTAMP
- UNIQUE(user_id, team_id)

## inventory_items
- id UUID PRIMARY KEY
- name VARCHAR
- description TEXT NULL
- category VARCHAR NULL
- sku VARCHAR NULL
- unit VARCHAR
- quantity DECIMAL NULL
- minimum_stock DECIMAL NULL
- supplier VARCHAR NULL
- cost_per_unit DECIMAL NULL
- created_by UUID REFERENCES users(id)
- updated_by UUID REFERENCES users(id)
- is_archived BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP

## inventory_team_assignments
- id UUID PRIMARY KEY
- inventory_item_id UUID REFERENCES inventory_items(id)
- team_id UUID REFERENCES teams(id)
- UNIQUE(inventory_item_id, team_id)

## inventory_transactions
- id UUID PRIMARY KEY
- inventory_item_id UUID REFERENCES inventory_items(id)
- user_id UUID REFERENCES users(id)
- team_id UUID REFERENCES teams(id)
- previous_quantity DECIMAL NULL
- new_quantity DECIMAL NULL
- adjustment_amount DECIMAL NULL
- transaction_type ENUM
- notes TEXT NULL
- idempotency_key UUID UNIQUE
- created_at TIMESTAMP

## messages
- id UUID PRIMARY KEY
- team_id UUID REFERENCES teams(id)
- sender_id UUID REFERENCES users(id)
- parent_message_id UUID NULL REFERENCES messages(id)
- content TEXT
- message_type ENUM
- is_pinned BOOLEAN
- edited_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP

## message_reads
- id UUID PRIMARY KEY
- message_id UUID REFERENCES messages(id)
- user_id UUID REFERENCES users(id)
- read_at TIMESTAMP
- UNIQUE(message_id, user_id)

## message_reactions
- id UUID PRIMARY KEY
- message_id UUID REFERENCES messages(id)
- user_id UUID REFERENCES users(id)
- reaction VARCHAR
- created_at TIMESTAMP

## notifications
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- team_id UUID NULL REFERENCES teams(id)
- notification_type ENUM
- title VARCHAR
- body TEXT
- related_entity_id UUID NULL
- is_read BOOLEAN
- created_at TIMESTAMP

## device_tokens
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- push_token TEXT
- platform ENUM
- created_at TIMESTAMP
- updated_at TIMESTAMP

## audit_logs
- id UUID PRIMARY KEY
- actor_id UUID REFERENCES users(id)
- action VARCHAR
- entity_type VARCHAR
- entity_id UUID
- previous_values JSONB NULL
- new_values JSONB NULL
- created_at TIMESTAMP

Add:
- Appropriate indexes.
- Foreign key constraints.
- Unique constraints.
- Check constraints.
- Cascading behavior only where safe.
- Database migrations.

Use soft deletion or archival where historical integrity matters.

Generate a complete Prisma schema and initial migrations.

---

# 13. MICROSERVICE ARCHITECTURE

Organize backend functionality into the following services.

## Authentication Service
Responsibilities:
- Registration.
- Login.
- Logout.
- Password management.
- JWT issuance.
- Refresh token rotation.
- Session management.

## User Service
Responsibilities:
- Employee profiles.
- Account management.
- User roles.
- Team membership.

## Team Service
Responsibilities:
- Team creation.
- Team editing.
- Team archival.
- Team assignments.
- Team permissions.

## Messaging Service
Responsibilities:
- Team message boards.
- Message creation.
- Replies.
- Reactions.
- Pinning.
- Read receipts.

## Inventory Service
Responsibilities:
- Inventory creation.
- Inventory updates.
- Quantity adjustments.
- Inventory history.
- Low-stock detection.
- Real-time inventory events.

## Notification Service
Responsibilities:
- Push notifications.
- In-app notifications.
- Notification preferences.
- Event subscriptions.

## Audit Service
Responsibilities:
- Activity tracking.
- Audit history.
- Security-relevant event records.

Use clear service boundaries and API contracts.

Do not create unnecessary microservices for trivial functionality.

Each service should have:
- Controllers.
- Business logic.
- Data access layer.
- DTOs.
- Validation.
- Error handling.
- Tests.

Use an event-driven communication pattern for cross-service events.

Define event contracts for:
- UserCreated.
- TeamCreated.
- TeamMembershipChanged.
- MessageCreated.
- MessageUpdated.
- InventoryItemCreated.
- InventoryQuantityAdjusted.
- InventoryItemArchived.
- LowStockDetected.

Use an event outbox pattern or equivalent reliable event publishing mechanism so database transactions and event publication cannot silently diverge.

---

# 14. API DESIGN

Implement RESTful API endpoints.

Example endpoints:

Authentication:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

Users:
- GET /users/me
- GET /users
- GET /users/:id
- PATCH /users/:id
- PATCH /users/:id/status

Teams:
- GET /teams
- POST /teams
- GET /teams/:id
- PATCH /teams/:id
- DELETE /teams/:id
- POST /teams/:id/members
- DELETE /teams/:id/members/:userId

Messaging:
- GET /teams/:id/messages
- POST /teams/:id/messages
- PATCH /messages/:id
- DELETE /messages/:id
- POST /messages/:id/replies
- POST /messages/:id/reactions
- POST /messages/:id/read
- POST /messages/:id/pin

Inventory:
- GET /inventory
- POST /inventory
- GET /inventory/:id
- PATCH /inventory/:id
- DELETE /inventory/:id
- POST /inventory/:id/adjust
- POST /inventory/:id/set-quantity
- GET /inventory/:id/history
- GET /teams/:id/inventory

Notifications:
- GET /notifications
- PATCH /notifications/:id/read
- POST /notifications/read-all

Document APIs using Swagger/OpenAPI.

Use consistent response structures, validation errors, pagination, and authentication requirements.

---

# 15. SECURITY AND RELIABILITY

Implement production-grade security practices.

Requirements:
- Password hashing with Argon2 or bcrypt.
- Secure access-token handling.
- Refresh-token rotation and revocation.
- Role-based access control.
- Team-level authorization.
- Request validation.
- Rate limiting.
- CORS configuration.
- SQL injection protection through parameterized ORM queries.
- Secure environment variable handling.
- Audit logging.
- Error handling.
- Input sanitization.
- HTTPS-ready configuration.
- No hardcoded secrets.
- No sensitive tokens in application logs.

Validate every request on the backend.

Employees must not access private team information unless they belong to the relevant team or have an authorized administrative role.

---

# 16. OFFLINE AND NETWORK HANDLING

Restaurants may have unreliable Wi-Fi.

Design the application to handle temporary network interruptions.

Requirements:
- Cache recently accessed data.
- Display connection status.
- Retry safe failed requests.
- Preserve unsent message drafts.
- Prevent duplicate inventory adjustments.
- Reconcile server state after reconnection.

Do not allow offline inventory adjustments to silently overwrite newer server values.

For offline inventory changes, queue an operation with an idempotency key and submit it after reconnecting, applying it as an atomic adjustment.

Clearly communicate pending and failed operations.

---

# 17. USER EXPERIENCE REQUIREMENTS

Prioritize speed and simplicity.

A busy restaurant employee should be able to:

- Open the app.
- See their team's latest updates.
- Read a message.
- Send a message.
- Find an inventory item.
- Increase or decrease its quantity.

These actions should require as few interactions as reasonably possible.

Use:
- Skeleton loading states.
- Pull-to-refresh.
- Empty states.
- Clear success and error feedback.
- Confirmation dialogs for destructive actions.
- Search with debounce.
- Smooth navigation.
- Accessible touch targets.
- Consistent typography.

Avoid unnecessary modal stacking.

Keep frequently used inventory controls immediately accessible.

---

# 18. REQUIRED FRONTEND SCREENS

Build fully functional screens for:

1. Splash screen.
2. Login.
3. Registration / invitation acceptance.
4. Home dashboard.
5. Team list.
6. Team details.
7. Team message board.
8. Message creation.
9. Message replies.
10. Inventory overview.
11. Inventory by team.
12. Inventory item details.
13. Add inventory item.
14. Edit inventory item.
15. Quantity adjustment.
16. Inventory history.
17. Notifications.
18. Employee directory.
19. Employee profile.
20. Team management.
21. Employee assignment management.
22. User settings.
23. Manager dashboard.
24. Administrator dashboard.

All screens must connect to actual backend endpoints.

Do not use placeholder buttons that do nothing.

Do not leave important workflows unimplemented.

---

# 19. TESTING REQUIREMENTS

Implement:

- Unit tests.
- API integration tests.
- Authentication tests.
- Authorization tests.
- Inventory transaction tests.
- Real-time messaging tests.
- Concurrent inventory update tests.
- Team membership permission tests.
- Frontend component tests.
- End-to-end tests for critical workflows.

Critical test scenario:

Two employees open the same inventory item simultaneously.

Employee A adds 5 units.

Employee B removes 2 units.

The final quantity must accurately reflect both operations.

Another critical scenario:

An employee sends a message to Front of House.

All connected Front of House members should receive the message immediately.

Employees who are not members of Front of House must not receive the private message.

---

# 20. PROJECT STRUCTURE

Use a clean monorepo architecture.

Suggested structure:

hidden-peak-dining/
  apps/
    mobile/
      app/
      components/
      features/
      hooks/
      services/
      store/
      theme/
      assets/
      tests/

  services/
    auth-service/
    user-service/
    team-service/
    messaging-service/
    inventory-service/
    notification-service/
    audit-service/

  packages/
    shared-types/
    validation/
    api-contracts/
    event-contracts/
    config/

  database/
    prisma/
      schema.prisma
      migrations/
      seed.ts

  docs/
    architecture.md
    api-documentation.md
    database-schema.md
    event-contracts.md
    setup-guide.md

  docker-compose.yml
  package.json
  README.md

Adjust this structure if needed, but preserve clear separation between frontend, backend, shared contracts, and database concerns.

---

# 21. DEVELOPMENT EXECUTION PLAN

Build the application in the following phases.

Phase 1: Architecture and foundation.
- Establish monorepo.
- Configure TypeScript.
- Configure PostgreSQL and Prisma.
- Create database schema.
- Seed default teams.
- Configure backend services.
- Implement authentication and authorization.

Phase 2: Frontend foundation.
- Establish design system.
- Build navigation.
- Build login and authentication screens.
- Build dashboard.
- Connect frontend to backend.

Phase 3: Teams and messaging.
- Implement team management.
- Implement employee assignments.
- Implement team message boards.
- Implement WebSockets.
- Implement notifications.

Phase 4: Inventory management.
- Implement item creation and editing.
- Implement quantity adjustments.
- Implement inventory history.
- Implement team inventory views.
- Implement real-time synchronization.
- Implement low-stock alerts.

Phase 5: Testing and optimization.
- Run integration tests.
- Test concurrent inventory changes.
- Test permissions.
- Optimize API calls.
- Test mobile responsiveness.
- Improve loading and error handling.

Phase 6: Documentation and AWS readiness.
- Document service boundaries.
- Document database migrations.
- Document environment variables.
- Document API contracts.
- Prepare services for containerization.
- Ensure the application is ready for a future AWS deployment.

---

# 22. CODING AGENT EXECUTION INSTRUCTIONS

Important instructions:

1. Do not simply generate a design document. Build the actual application.
2. Start by inspecting the existing repository before creating or modifying files.
3. Establish the architecture and project structure.
4. Implement complete, working functionality in logical phases.
5. Do not substitute mock data for actual database functionality.
6. Do not hardcode the three default teams in the frontend.
7. Keep all API interactions centralized and typed.
8. Maintain consistent TypeScript types across services.
9. Use environment variables for all configuration.
10. Write database migrations and seed scripts.
11. Ensure all critical actions are validated on the backend.
12. Write tests as functionality is implemented.
13. Document how to run the entire application locally.
14. Do not stop after generating the frontend.
15. Do not leave TODO placeholders for core functionality.
16. Keep the code modular, readable, maintainable, and production-oriented.

If a decision is not specified, choose the most secure, maintainable, and user-friendly implementation.

Do not ask unnecessary questions. Make reasonable engineering decisions and document them.

At the end of each development phase:
- Run relevant tests.
- Fix errors.
- Summarize implemented functionality.
- Identify remaining work.
- Continue to the next phase.

**FINAL OBJECTIVE: Deliver a fully functional Hidden Peak Dining mobile operations platform with team communication, employee management, notifications, and real-time inventory management, ready for future deployment to AWS.**