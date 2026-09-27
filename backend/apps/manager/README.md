# Tech Manager Module (`apps/manager`)

This folder contains the complete, sorted implementation of the **Tech Manager & Mentor** persona capabilities for the PERFORMAX system.

---

## 📂 Sorted Folder Architecture

```
backend/apps/manager/
├── views/
│   ├── __init__.py                  # Package exports
│   ├── base.py                      # Permissions (IsManagerUser) & Direct Reports isolation (get_manager_reports_qs)
│   ├── mentees_views.py             # Feature M-01: View Assigned Interns / Employees
│   ├── tasks_views.py               # Feature M-02: Assign Tasks & M-03: Manage Tasks & Goals
│   ├── technical_parameters_views.py# Feature M-04: Manage Technical Capability Parameters
│   ├── technical_reviews_views.py   # Feature M-05: Review Technical Capability Matrix
│   ├── evidence_views.py            # Feature M-06: View & Review Evidence Submissions & Decisions
│   ├── feedback_views.py            # Feature M-07: Give Feedback & M-08: Review Employee Feedback
│   ├── appraisal_views.py           # Feature M-09: Conduct Review, M-10: Save Draft, M-11: Submit Review
│   ├── history_views.py             # Feature M-12: View Previous Reviews & Historical Archive
│   └── dashboard_views.py           # Unified Manager Telemetry & KPI Stats
├── urls.py                          # Clean URL route mappings
├── views.py                         # Re-export facade ensuring 100% backward compatibility
└── README.md                        # Documentation of all 12 sorted manager functionalities
```

---

## 🛡️ Role-Based Access Control (RBAC)
- All views in this module enforce `IsManagerUser`.
- Calling endpoints without `MANAGER`, `HR`, or `SUPER_ADMIN` privileges will be rejected with **HTTP 403 Forbidden**.
- Data queries are strictly scoped to the manager's assigned mentees via `get_manager_reports_qs(request.user)`.
