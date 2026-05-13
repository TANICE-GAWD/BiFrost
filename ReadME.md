# BiFrost Integrations

these are the b2b endpoints built on top of bifrost. normal users dont see any of this, its for fortuna and their partners to use.

---

## Compliance API

`GET /api/v1/member/:id/compliance?month=YYYY-MM`

fortuna or a health plan hits this to check if a member is on track. returns a GREEN / YELLOW / RED status plus a confidence score based on how many hours are actually verified vs just manually logged.

you pass the user id and the month and it does the math. needs `X-API-Key` header.

---

## Redetermination Payload

`GET /api/v1/member/:id/redetermination?month=YYYY-MM`

this one bundles everything up into a single json packet — all the sessions, the original documents, signed download urls for each file. the idea is fortuna pulls this at the end of the month and pushes it to the state enrollment system (calheers, ny hx etc) for renewal.

so bifrost isnt a silo, its a feeder for the renwal pipeline.

---

## Unite Us Webhook

runs automaticaly every day at noon via vercel cron.

if its past the 15th and a member has logged less than 10 hours that month, it fires a webhook to whatever `UNITE_US_WEBHOOK_URL` is set to. the payload tells unite us to trigger a job assistance referral for that member.

basically if someones falling behind, bifrost reaches out to get them help before they lose coverage. thats the sdoh angle.

---

## FHIR Mapping

`GET /api/fhir/Observation?patient=:id&date=YYYY-MM`

maps every session to a fhir r4 observation resource and returns a bundle. work sessions become `CE-WORK`, education becomes `CE-EDU`, volunteer becomes `CE-VOL`.

this is so bifrost can talk to ehrs like epic or cerner and to federal systems. no fhir library needed, its just json that follows the r4 spec.

---

## Auth

features 1, 2, and 4 all need `X-API-Key` in the header. the key is `COMPLIANCE_API_KEY` set in vercel env. cron is protected by verecl's own `CRON_SECRET` automatically.

generate a diffrent key per partner if u want to track or revoke access individually.
