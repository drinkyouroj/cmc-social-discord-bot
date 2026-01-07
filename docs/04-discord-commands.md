### Discord commands

All commands are **slash commands**.

### User commands

#### `/register handle:<CMC_HANDLE>`

Starts registration:
- Creates a unique code (expires in 12h)
- Stores it as a pending registration

Expected outcome:
- User gets a code like `CMC-XXXXXXXX`

#### `/verify post:<CMC_POST_URL_OR_ID>`

Completes registration by verifying:
- post author handle equals the requested handle (exact match)
- post `postTime` is after code `issuedAt`
- post `textContent` contains the code (case-insensitive)

If Apify times out fetching the post, the bot responds with a retryable error.

#### `/submit url:<CMC_POST_URL>`

Submits a post for approval:
- verifies author matches the registered handle (exact match)
- rejects if older than `maxPostAgeDays` (guild config)
- rejects if `postStableId` has already been submitted
- requires bullish flag:
  - missing → pending review
  - false → rejected
  - true → continue
- runs Paralon sentiment and stores results
- auto-approves only when:
  - bullish=true AND sentiment label=positive AND confidence >= sentimentMinConfidence

### Admin commands

Admin checks:
- allowlisted user OR has configured admin role OR matches `DEFAULT_ADMIN_DISCORD_USER_ID`

#### `/admin config set-admin-role role_id:<ROLE_ID>`

Sets a guild role ID that is allowed to administer the bot.

#### `/admin config set-max-post-age-days days:<N>`

Sets submission max age.

#### `/admin config set-sentiment-min-confidence confidence:<0..1>`

Sets the min confidence used for auto-approval.

#### `/admin allowlist add user:<USER>`
#### `/admin allowlist remove user:<USER>`

Manages allowlisted admins for a guild.

#### `/admin review list status:<optional> unawarded_only:<optional>`

Lists the most recent submissions (up to 10), including:
- status
- bullish flag
- LLM label/confidence
- points awarded state

#### `/admin review approve id:<SUBMISSION_ID>`
#### `/admin review reject id:<SUBMISSION_ID> reason:<TEXT>`

Marks the submission approved/rejected.

#### `/admin points award id:<SUBMISSION_ID> amount:<N> currency:<optional> note:<optional>`
#### `/admin points revoke id:<SUBMISSION_ID> note:<optional>`

Tracking-only points “awards” stored on the `Submission`.

#### `/admin reset-user user:<USER>`

Resets a user’s global registration and pending registrations.

