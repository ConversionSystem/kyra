# MEMORY.md — Kyra Container Long-Term Memory

*Container memory — tracks patterns across client sessions.*

---

## Platform Notes

- Kyra serves agency clients via GHL CRM integration
- Each client-contact pair gets an isolated session
- System context is injected with business identity + customer data
- Responses must match channel format (SMS=short, Email=detailed)
