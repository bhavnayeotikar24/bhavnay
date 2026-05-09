# Security Specification - LIMS Application

## Data Invariants
1. **Admin Identity**: An admin document ID must match the user's Firebase Auth UID.
2. **Role Hierarchy**: 
   - `super-admin` has absolute control.
   - `admin` can manage all roles except other `super-admin` accounts.
   - `analyst` and `quality-manager` have no write access to the `admins` collection.
3. **Audit Integrity**: Audit logs are append-only. No updates or deletions allowed.
4. **Report Ownership**: Reports can be created and managed by any authenticated system user.

## The Dirty Dozen Payloads (Targeting Logic Vulnerabilities)

1. **Identity Theft**: An `analyst` tries to create an admin document for themselves in the `admins` collection.
2. **Privilege Escalation (Admin)**: An `admin` tries to update another `admin`'s role to `super-admin`.
3. **Privilege Escalation (Self)**: A `quality-manager` tries to update their own role in `admins` to `admin`.
4. **Unauthorized Deletion**: An `admin` tries to delete a `super-admin` account.
5. **Unauthorized Read**: An unauthenticated user tries to read the `admins` collection.
6. **Report Hijacking**: An unauthenticated user tries to create a report.
7. **Audit Tampering (Delete)**: A `super-admin` tries to delete an audit log to hide suspicious activity.
8. **Audit Tampering (Update)**: A `super-admin` tries to modify an existing audit log entry.
9. **Shadow Field Injection**: An `admin` tries to create a new `analyst` with a hidden `internal_debug_mode: true` field.
10. **ID Poisoning**: A user tries to create a report with a 2MB string as the document ID.
11. **Email Spoofing**: A user tries to create an admin entry with an admin email but `email_verified: false` (if we enforce verification).
12. **Cross-Tenant Write**: (Not applicable here as it's single-tenant, but we guard IDs regardless).

## Test runner - `firestore.rules.test.ts`
(Note: This is a conceptual test plan as the environment doesn't support running these tests locally, but we define the logic here for verification).

- `test('unauthenticated users cannot read admins', ...)`
- `test('analysts cannot write to admins', ...)`
- `test('admins cannot create super-admins', ...)`
- `test('admins cannot delete super-admins', ...)`
- `test('audit logs are immutable', ...)`
