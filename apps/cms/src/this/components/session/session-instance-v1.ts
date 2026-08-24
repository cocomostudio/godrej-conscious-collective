
/**
 |
 | Populate fragment for `session.session-instance-v1`.
 |
 | A leaf, and not a member of any dynamic zone: instances are a repeatable
 | component on the Session itself, so this fragment is reached from the
 | content type's populate rather than from a zone's `on` map. Both ends are
 | scalars, so there is nothing to reach for; the empty map is deliberate
 | rather than missing.
 |
 */

export const populate_session_instance_v1 = {}
