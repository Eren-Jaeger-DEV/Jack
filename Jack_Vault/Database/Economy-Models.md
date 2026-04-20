# 💰 Economy & Market Models (POP)

These models power the bot's custom currency (POP) and the peer-to-peer marketplace.

---

## [[PopListing]]
Tracks items or currency listed for sale by users.

### 📋 Schema Fields
- `listingID` (String, Unique): The internal ID for the listing.
- `sellerID` / `sellerName`: Data of the user selling the items.
- `popAmount`: The amount of POP currency being traded.
- `price`: The price in secondary currency or real-world equivalent.
- `status`: `active`, `pending`, `completed`, or `cancelled`.

---

## [[PopDeal]]
Tracks active transactions between a buyer and a seller.

### 📋 Schema Fields
- `listingID`: Reference to the original listing.
- `sellerID` / `buyerID`: The parties involved in the deal.
- `status`: `ongoing`, `finalized`, or `cancelled`.

---
**Related Documents:** [[00 - Schema Overview]], [[Market]]
