# NIP-XYZ: Event Rating Protocol

| Field   | Value                       |
| ------- | --------------------------- |
| NIP     | XYZ                         |
| Title   | Event Rating Protocol       |
| Author  | <Your Name or Nostr Pubkey> |
| Status  | Draft                       |
| Type    | Standard                    |
| Created | 2025-04-30                  |
| License | MIT                         |

## Summary

This NIP defines a standard for rating Nostr events. It introduces a new event kind where users can rate any existing event using a normalized score. Ratings are tied to the target event and include metadata that ensures validity and enables aggregation.

## Motivation

There is currently no native way to express subjective feedback (like ratings) on Nostr events. This NIP allows users to submit structured ratings, enabling use cases such as content ranking, quality scoring, recommendation systems, and decentralized reputation.

## Definitions

- **Rating**: A user-assigned value indicating the perceived quality or relevance of a target event.
- **Normalized Rating**: A rating expressed as a fraction (`rating` / `out_of`), enabling fair comparison across ratings with different scales.

## Event Kind

A new event kind (suggested: `KIND 30090`) is introduced for submitting ratings.

## Event Structure

```json
{
  "kind": 30090,
  "content": "",
  "tags": [
    ["e", "<target_event_id>"],
    ["rating", "<integer_rating_value>"],
    ["outOf", "<integer_denominator>"]
  ]
}
```
