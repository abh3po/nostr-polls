## Summary

This NIP defines a standard for rating Nostr anything and everything. Ratings are tallied against a unique id.

## Definitions

- **Rating**: A user-assigned value indicating the perceived quality or relevance of a target event, normalized to be a value between 0 and 1
- **m** : mark : A tag used to specify the type of entity being rated. Example values could include 'event', 'profile', 'relay', 'hashtag', 'books', 'movies', etc. If empty it is asssumed to be a nostr event.

## Event Kind

A new event kind (suggested: `KIND 34259`) is introduced for submitting ratings.

## Event Structure

```json
{
  "kind": 34259,
  "content": "Optional Comment",
  "tags": [
    ["d", "<Id of entity being rated>"],
    ["m", "type of entity being rated, example: event, profile, relay, etc."]
    ["rating", "<Number less than 1 and greater than 0>"]
  ]
  ...
}
```

## Notes

For d-tags that have identifiers that are not unique, the id should be prefixed by the m-tag value. For example: If you want to rate a hashtag use `hashtag:<tag>` as the identifier for the d-tag. This will help in differentiating between different types of entities with the same ID. For example:
`hasthag:books` this will help distinguish the events from other contexts like market listings or other categories.

## Example Event

```json
{
  "kind": 34259,
  "content": "Great event!",
  "tags": [
    ["d", "hashtag:books"],
    ["m", "event"],
    ["rating", ""0.8""]
  ]

}
```
