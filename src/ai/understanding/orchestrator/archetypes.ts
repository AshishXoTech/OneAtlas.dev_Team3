export const ARCHETYPE_BASELINES: Record<string, any> = {
  "crm": {
    "entities": [
      { "id": "ent_user", "name": "User", "description": "System user", "attributes": [{ "name": "email", "type": "string", "isRequired": true }] },
      { "id": "ent_lead", "name": "Lead", "description": "Potential customer", "attributes": [{ "name": "name", "type": "string", "isRequired": true }] }
    ],
    "features": [{ "id": "feat_lead_mgnt", "name": "Lead Management", "description": "Track leads" }]
  },
  "e-commerce": {
    "entities": [
      { "id": "ent_product", "name": "Product", "description": "Items for sale", "attributes": [{ "name": "price", "type": "number", "isRequired": true }] },
      { "id": "ent_order", "name": "Order", "description": "Customer purchase", "attributes": [{ "name": "status", "type": "string", "isRequired": true }] }
    ],
    "features": [{ "id": "feat_catalog", "name": "Product Catalog", "description": "Browse items" }]
  },
  "blog": {
    "entities": [
      { "id": "ent_post", "name": "Post", "description": "Blog article", "attributes": [{ "name": "title", "type": "string", "isRequired": true }] },
      { "id": "ent_comment", "name": "Comment", "description": "User feedback", "attributes": [{ "name": "content", "type": "string", "isRequired": true }] }
    ],
    "features": [{ "id": "feat_posting", "name": "Content Management", "description": "Create and edit posts" }]
  },
  "other": {
    "entities": [
      { "id": "ent_generic", "name": "Entity", "description": "Generic entity", "attributes": [{ "name": "name", "type": "string", "isRequired": true }] }
    ],
    "features": [{ "id": "feat_generic", "name": "Base Features", "description": "Standard application capabilities" }],
    "pages": [],
    "workflows": []
  }
};
