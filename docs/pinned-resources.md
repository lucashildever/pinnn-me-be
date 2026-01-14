# Pinned Resources Feature

A feature to "pin" resources at the top of a collection feed, similar to pinning posts in social networks.

## Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant CollectionsController
    participant CollectionsService
    participant ResourcesService
    participant Database

    Note over Client,Database: Pin a Resource
    Client->>CollectionsController: POST /:collectionId/pin
    CollectionsController->>CollectionsService: pinResource(collectionId, {resourceId})
    CollectionsService->>Database: Validate resource belongs to collection
    CollectionsService->>Database: Check if already pinned
    CollectionsService->>Database: Generate fractional order key
    CollectionsService->>Database: Create PinnedResourceEntity
    CollectionsService-->>Client: {id, order}

    Note over Client,Database: Get Resources (with pinned first)
    Client->>ResourcesService: GET /resources/collection/:id
    ResourcesService->>CollectionsService: getPinnedResourceIds(collectionId)
    ResourcesService->>Database: Fetch pinned resources
    ResourcesService->>Database: Fetch non-pinned resources
    ResourcesService-->>Client: [{...resource, isPinned: true}, ...]
```

## Backend Modules

### Entity

- `PinnedResourceEntity`: Join table between `Collection` and `Resource` with `order` column (fractional indexing)

### DTOs

- `PinResourceDto`: `{ resourceId: string }`
- `ReorderPinnedResourceDto`: `{ newOrder: string }`

### Service Methods (`CollectionsService`)

- `pinResource(collectionId, dto)`: Pin resource to collection (validates ownership)
- `unpinResource(collectionId, resourceId)`: Remove pin
- `reorderPinnedResource(pinnedId, dto)`: Reorder pinned resources
- `findPinnedResources(collectionId)`: List pinned resources
- `getPinnedResourcesInfo(collectionId)`: Helper for ResourcesService

### Controller Endpoints

| Method   | Endpoint                           | Description             |
| -------- | ---------------------------------- | ----------------------- |
| `POST`   | `/:collectionId/pin`               | Pin a resource          |
| `DELETE` | `/:collectionId/unpin/:resourceId` | Unpin a resource        |
| `PATCH`  | `/pinned/:pinnedId/reorder`        | Reorder pinned resource |

### Modified Behavior

- `ResourcesService.findResources()`: Returns response with `pinnedResources` array (always first) and paginated `resources` array
- `ResourcesService.findPinnedResourcesWithData()`: Removed to avoid circular dependency
