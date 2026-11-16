# Firebase rules update: division leaders and travel orders

**Why:** Division leaders now assign people to events instead of filing travel orders. An admin prepares the travel order, with the assigned people already filled in. The app already enforces this. These rules make Firebase enforce it too, so it can't be bypassed outside the app.

**What changes:** only the `travelOrders` section. Everything else is the same as your current live rules.

## How to apply

1. Open the **Firebase console** and go to **Firestore Database → Rules**.
2. Select everything in the editor and delete it.
3. Paste the full rules from the end of this file. They're the same as `firestore.rules` in the project.
4. Press **Publish**.

## The change

### Removed
These two lines let division leaders file any travel order and edit anyone's:

```
// division leaders file and edit any travel order, but cannot prepare it or decide the TEV
allow create: if stamped() && isLeader() && request.resource.data.status == 'Filed' && request.resource.data.tev == '';
allow update: if stamped() && isLeader() && request.resource.data.status == resource.data.status && request.resource.data.tev == resource.data.tev;
```

### Changed
The regular staff rule now excludes leaders, so they also can't file or edit travel orders as ordinary staff. The addition is `&& !isLeader()`:

```
allow create: if stamped() && (isAdmin() || (isMember() && !isLeader()
  && request.resource.data.createdBy == myName() && request.resource.data.status == 'Filed' && request.resource.data.tev == ''));
allow update: if stamped() && (isAdmin() || (isMember() && !isLeader()
  && resource.data.createdBy == myName() && resource.data.status == 'Filed'
  && request.resource.data.createdBy == myName() && request.resource.data.status == 'Filed'
  && request.resource.data.tev == resource.data.tev));
```

## Who can do what afterwards

| | Travel orders | Events (incl. assigning people) | Skills |
|---|---|---|---|
| **Admin** | Everything | Everything | Everything |
| **Division leader** | Read only | Add, edit, assign people | Change skills |
| **Staff** | File and edit their own until it is prepared | Add an unconfirmed event when filing a travel order | — |

Deleting a travel order counts as an edit in this app, because it's marked as deleted rather than erased. So the same rules cover deleting.

## Full rules to paste

```
rules_version = '2';
// PIO Overwatch security rules. Paste this whole file into Firebase console > Firestore Database > Rules, then Publish.
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn() { return request.auth != null; }
    function memberDoc() { return /databases/$(db)/documents/members/$(request.auth.uid); }
    function isMember() { return signedIn() && exists(memberDoc()) && get(memberDoc()).data.active == true; }
    function isAdmin() { return isMember() && get(memberDoc()).data.role == 'admin'; }
    function myName() { return get(memberDoc()).data.username; }
    function isLeader() { return isMember() && get(memberDoc()).data.role == 'scheduler'; }   // shown as Division Leader
    function stamped() { return request.resource.data._t == request.time; }
    // the very first sign-up: creates meta/app and the first admin in one batch
    function setupBatch() {
      return signedIn() && !exists(/databases/$(db)/documents/meta/app)
        && getAfter(/databases/$(db)/documents/meta/app).data.owner == request.auth.uid;
    }
    function adminWrite() { return isAdmin() || setupBatch(); }

    match /meta/app {
      allow read: if true;
      allow create: if signedIn() && request.resource.data.owner == request.auth.uid;
      allow update: if isAdmin();
    }
    match /members/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isAdmin());
      allow create: if isAdmin() || (setupBatch() && uid == request.auth.uid && request.resource.data.role == 'admin');
      allow update, delete: if isAdmin();
    }
    // username -> sign-in address; needed before signing in
    match /logins/{username} {
      allow read: if true;
      allow write: if adminWrite();
    }
    match /divisions/{id} {
      allow read: if true;                       // the sign-in page shows the divisions
      allow write: if adminWrite() && stamped();
    }
    match /users/{username} {
      allow read: if isMember();
      allow write: if adminWrite() && stamped();
      // staff may change only their own division (picked on the sign-in page)
      allow update: if isMember() && username == myName() && stamped()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['division', '_t']);
      // division leaders may change skills only
      allow update: if isLeader() && stamped()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['skills', '_t']);
    }
    match /holidays/{id} {
      allow read: if isMember();
      allow write: if adminWrite() && stamped();
    }
    match /settings/{id} {
      allow read: if isMember();
      allow write: if adminWrite() && stamped();
    }
    match /board/{id} {                          // who is out (no leave types)
      allow read: if isMember();
      allow write: if isAdmin() && stamped();
    }
    match /travelOrders/{id} {
      allow read: if isMember();
      // Division leaders do not file or edit travel orders: they assign people on the event,
      // and an admin prepares the travel order. Other staff may file and edit their own until it is prepared.
      allow create: if stamped() && (isAdmin() || (isMember() && !isLeader()
        && request.resource.data.createdBy == myName() && request.resource.data.status == 'Filed' && request.resource.data.tev == ''));
      allow update: if stamped() && (isAdmin() || (isMember() && !isLeader()
        && resource.data.createdBy == myName() && resource.data.status == 'Filed'
        && request.resource.data.createdBy == myName() && request.resource.data.status == 'Filed'
        && request.resource.data.tev == resource.data.tev));
    }
    match /events/{id} {
      allow read: if isMember();
      allow write: if stamped() && (isAdmin() || isLeader());
      // anyone filing a travel order may add its event, unconfirmed
      allow create: if stamped() && isMember() && request.resource.data.status == 'Pending' && request.resource.data.createdBy == myName();
      // anyone may change the equipment plan of an event (the app limits it to production staff)
      allow update: if stamped() && isMember() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['gear', 'gearHolder', 'gearBy', 'gearAt', '_t']);
    }
    match /inventory/{id} {
      allow read: if isMember();
      allow write: if stamped() && isMember();
    }
    match /entries/{id} {
      allow read: if isAdmin() || (isMember() && resource.data.username == myName());
      allow create: if stamped() && (isAdmin() || (isMember()
        && request.resource.data.username == myName() && request.resource.data.createdBy == myName()
        && request.resource.data.status == 'Pending' && request.resource.data.type in ['EARN', 'USE']));
      // staff may edit or remove (mark _del) their own entries while still waiting for review
      allow update: if stamped() && (isAdmin() || (isMember()
        && resource.data.username == myName() && resource.data.status == 'Pending'
        && request.resource.data.username == myName() && request.resource.data.status == 'Pending'
        && request.resource.data.type == resource.data.type));
    }
    match /leaves/{id} {
      allow read: if isAdmin() || (isMember() && resource.data.username == myName());
      allow write: if isAdmin() && stamped();
    }
    match /credits/{id} {
      allow read: if isAdmin() || (isMember() && resource.data.username == myName());
      allow write: if isAdmin() && stamped();
    }
    match /tevs/{id} {
      allow read: if isAdmin() || (isMember() && resource.data.username == myName());
      allow write: if isAdmin() && stamped();
    }
    match /activity/{id} {                       // audit trail: added to, never changed
      allow read: if isAdmin();
      allow create: if stamped() && (isAdmin() || setupBatch() || (isMember() && request.resource.data.actor == myName()));
    }
  }
}
```
