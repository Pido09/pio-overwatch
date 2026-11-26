# Firebase rules update: profile sign-in and photos

**Why:** The new sign-in shows each division's people with their names and photos before anyone signs in. Each person can also set their own profile photo. These rules let a person change **only their own photo**, and nothing else.

**What changes:** two small additions. Everything else stays the same as your live rules.

## How to apply

1. Open the **Firebase console** and go to **Firestore Database → Rules**.
2. Select everything in the editor and delete it.
3. Paste the full rules from the end of this file. They're the same as `firestore.rules` in the project.
4. Press **Publish**.

Until you publish, everything else works. Admins can set anyone's photo, but staff who try to change their own will get a permission error.

## The changes

### Login list (`logins`)
Each person may update the photo on their own entry:

```
allow update: if isMember() && username == myName()
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['photo']);
```

### Staff records (`users`)
Staff could already change their own division. Now they can also change their own photo:

```
hasOnly(['division', 'photo', '_t'])
```

## What becomes visible before sign-in

The login list could always be read without signing in, because the app needs it to sign people in. It now also holds each active person's **name, division and photo**, so anyone who opens the app's sign-in page can see them. Nothing else is shown: no offsets, travel orders or leave. Admins keep this list up to date automatically when they open the app.

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
    // username -> sign-in address, plus name, division and photo for the sign-in page; needed before signing in
    match /logins/{username} {
      allow read: if true;
      allow write: if adminWrite();
      // everyone may change their own photo
      allow update: if isMember() && username == myName()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['photo']);
    }
    match /divisions/{id} {
      allow read: if true;                       // the sign-in page shows the divisions
      allow write: if adminWrite() && stamped();
    }
    match /users/{username} {
      allow read: if isMember();
      allow write: if adminWrite() && stamped();
      // staff may change only their own division (picked on the sign-in page) and their own photo
      allow update: if isMember() && username == myName() && stamped()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['division', 'photo', '_t']);
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
