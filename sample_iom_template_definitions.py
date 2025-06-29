SAMPLE_IOM_TEMPLATES_DATA = [
    # ==== PROCUREMENT MODULE IOMS ====
    # 1. Request for New Software License Procurement
    {
        "name": "Request for New Software License Procurement",
        "description": "Formal request to procure new software licenses.",
        "category_name": "Procurement Requests",
        "approval_config": {"type": "simple", "simple_approver_username": "it_manager_user"}, # Placeholder username
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "IT Department - Software Services", "readonly": True},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "subject_software_name", "label": "Software Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., DataGuard Pro"},
            {"name": "licenses_count", "label": "Number of Licenses", "type": "number", "required": True, "attributes": {"min": 1}},
            {"name": "software_description_justification", "label": "Software Description and Justification", "type": "text_area", "required": True, "attributes": {"rows": 5}, "placeholder": "Describe the software, its purpose, and why it's needed."},
            {"name": "required_by_date", "label": "Licenses Required By Date", "type": "date", "required": False},
            {"name": "estimated_cost", "label": "Estimated Total Cost (USD)", "type": "number", "required": False, "attributes": {"step": "0.01"}},
            {"name": "vendor_suggestion", "label": "Suggested Vendor (Optional)", "type": "text_short", "required": False},
            {"name": "quote_attachment_description", "label": "Quote/Supporting Document Description", "type": "text_area", "required": False, "helpText": "Describe any attached quotes or documents."},
        ],
        "allowed_group_names": ["it_department_group"], # Placeholder group name
    },
    # 2. Urgent Procurement - Critical Server Component
    {
        "name": "Urgent Procurement - Critical Server Component",
        "description": "Request for immediate procurement of a critical server component.",
        "category_name": "Procurement Requests",
        "approval_config": {"type": "advanced"},
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Data Center Operations", "readonly": True},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "subject_item_name", "label": "Component Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., Replacement Power Supply Unit"},
            {"name": "server_name_id", "label": "Affected Server Name/Asset ID", "type": "text_short", "required": True, "placeholder": "e.g., DB-PROD-01 (Asset ID: SRV0012)"},
            {"name": "component_details", "label": "Component Details & Specifications", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "Detailed specifications of the required component."},
            {"name": "urgency_justification", "label": "Reason for Urgency & Impact", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "Explain the critical failure, impact on business applications, etc."},
            {"name": "required_delivery_by_datetime", "label": "Required Delivery By (Date & Time)", "type": "datetime", "required": True},
            {"name": "vendor_recommendations", "label": "Vendor Recommendations (Optional)", "type": "text_area", "required": False},
            {"name": "attachment_description", "label": "Attached Document Description (e.g., Specs, Quotes)", "type": "text_area", "required": False},
        ],
        "allowed_group_names": ["data_center_ops_group", "it_management_group"], # Placeholder group names
    },
    # 3. Vendor Performance Review - Q2 2025
    {
        "name": "Vendor Performance Review - Q2 2025",
        "description": "Request feedback for quarterly vendor performance review.",
        "category_name": "Procurement Policies/Audits",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients_description", "label": "To (e.g., All Department Heads Using Vendor)", "type": "text_area", "required": True, "placeholder": "Describe the target recipients"},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "review_date", "label": "Review Initiation Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "vendor_name_for_subject", "label": "Vendor Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., OfficeSupplies Inc."},
            {"name": "review_period_for_subject", "label": "Review Period (for Subject)", "type": "text_short", "required": True, "defaultValue": "Q2 2025", "helpText": "e.g., Q2 2025"},
            {"name": "introduction", "label": "Introduction / Purpose", "type": "text_area", "required": True, "attributes": {"rows": 3}, "defaultValue": "The Procurement Department is conducting its quarterly performance review for the specified vendor. Your feedback is essential for evaluating their service quality and compliance with contract terms."},
            {"name": "feedback_areas", "label": "Areas for Feedback (Guidance)", "type": "text_area", "required": False, "attributes": {"rows": 3}, "defaultValue": "Please submit your assessment covering: delivery accuracy, product quality, responsiveness, and invoicing clarity."},
            {"name": "submission_deadline", "label": "Feedback Submission Deadline", "type": "date", "required": True},
            {"name": "attachment_link_or_description", "label": "Feedback Form (Link or Description)", "type": "text_area", "required": False, "placeholder": "e.g., Link to online form, or 'See attached feedback form.'"},
        ],
        "allowed_group_names": ["procurement_department_group", "department_heads_group"], # Placeholder group names
    },
    # 4. Approval for New Supplier Onboarding - Cloud Services
    {
        "name": "Approval for New Supplier Onboarding - Cloud Services",
        "description": "Seek approval for onboarding a new supplier for cloud services.",
        "category_name": "Procurement Requests",
        "approval_config": {"type": "advanced"}, # Assumes rules will target Head of Finance, Head of IT
        "fields_definition": [
            {"name": "to_approvers_description", "label": "To (Approvers)", "type": "text_area", "required": True, "defaultValue": "Head of Finance, Head of IT", "helpText": "Actual approvers determined by Advanced Workflow rules."},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "supplier_name_for_subject", "label": "Supplier Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., CloudSolutions Pro"},
            {"name": "service_type_for_subject", "label": "Service Type (for Subject)", "type": "text_short", "required": True, "defaultValue": "Cloud Service Provider"},
            {"name": "onboarding_justification", "label": "Justification for Onboarding", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "Detail the RFP process, technical evaluation, benefits (scalability, security, cost-efficiency)."},
            {"name": "strategic_alignment", "label": "Strategic Alignment", "type": "text_area", "required": False, "attributes": {"rows": 2}, "placeholder": "e.g., Vital for strategic shift towards a hybrid cloud environment."},
            {"name": "msa_attachment_description", "label": "Master Service Agreement (MSA) - Attachment Description", "type": "text_area", "required": True, "placeholder": "e.g., Proposed MSA is attached for review."},
            {"name": "approval_deadline", "label": "Approval Deadline", "type": "date", "required": False},
        ],
        "allowed_group_names": ["procurement_department_group"],
    },
    # 5. Notice of Contract Renewal - Network Equipment Maintenance
    {
        "name": "Notice of Contract Renewal - Network Equipment Maintenance",
        "description": "Notify stakeholders of intent to renew a maintenance contract.",
        "category_name": "Procurement Notifications",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_department_stakeholder", "label": "To (Primary Stakeholder Department)", "type": "text_short", "required": True, "defaultValue": "IT Department - Network Operations"},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "notice_date", "label": "Notice Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "contract_subject_for_subject", "label": "Contract Subject (for Subject Line)", "type": "text_short", "required": True, "defaultValue": "Maintenance Contract for Cisco Network Equipment"},
            {"name": "vendor_name", "label": "Vendor Name", "type": "text_short", "required": True, "defaultValue": "NetCare Solutions"},
            {"name": "contract_id", "label": "Contract ID", "type": "text_short", "required": True, "defaultValue": "NC2023-005"},
            {"name": "renewal_date", "label": "Contract Renewal Date", "type": "date", "required": True},
            {"name": "renewal_justification", "label": "Reason for Intent to Renew", "type": "text_area", "required": True, "attributes": {"rows": 3}, "defaultValue": "Based on satisfactory performance and competitive pricing, the Procurement Department intends to renew this contract for another 12 months."},
            {"name": "feedback_request_deadline", "label": "Deadline for Concerns/Amendments", "type": "date", "required": False},
        ],
        "allowed_group_names": ["procurement_department_group", "it_department_group"],
    },
    # 6. Policy Update - Purchase Order Revision Procedures
    {
        "name": "Policy Update - Purchase Order Revision Procedures",
        "description": "Announce updated procedures for Purchase Order (PO) revisions.",
        "category_name": "Procurement Policies/Audits",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Department Heads & Authorized Requisitioners)", "type": "text_area", "required": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "announcement_date", "label": "Announcement Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "policy_effective_date", "label": "Policy Effective Date", "type": "date", "required": True},
            {"name": "summary_of_changes", "label": "Summary of New Procedures", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "e.g., All revision requests must now be submitted through the 'PO Change Request' form on the ITSM portal..."},
            {"name": "old_procedure_deprecation", "label": "Old Procedure Note (Optional)", "type": "text_short", "required": False, "defaultValue": "Manual email requests will no longer be processed."},
            {"name": "guidance_document_location", "label": "Link or Location of Detailed Guide", "type": "text_area", "required": True, "placeholder": "e.g., A detailed guide is available on the Procurement section of the company intranet."},
            {"name": "adherence_statement", "label": "Adherence Statement", "type": "text_short", "required": False, "defaultValue": "Your adherence to these new guidelines is mandatory."},
        ],
        "allowed_group_names": ["all_employees_group"], # Placeholder group name
    },
    # 7. Request for Quotation (RFQ) Initiation - Office Furniture
    {
        "name": "Request for Quotation (RFQ) Initiation - Office Furniture",
        "description": "Formal request to initiate an RFQ process for office furniture.",
        "category_name": "Procurement Requests",
        "approval_config": {"type": "simple", "simple_approver_username": "facilities_head_user"}, # Placeholder
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Facilities Management", "readonly": True},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "rfq_subject_item", "label": "Item for RFQ (for Subject)", "type": "text_short", "required": True, "defaultValue": "New Office Furniture"},
            {"name": "project_name_context", "label": "Project/Context for RFQ", "type": "text_short", "required": True, "placeholder": "e.g., East Wing Expansion"},
            {"name": "item_requirements_summary", "label": "Summary of Items Required", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Ergonomic chairs, adjustable desks, storage units, meeting room furniture for 75 new workstations."},
            {"name": "target_delivery_installation_date", "label": "Target Delivery & Installation Date", "type": "date", "required": True},
            {"name": "attachment_description_specs_plans", "label": "Detailed Specifications & Floor Plans (Attachment Description)", "type": "text_area", "required": True},
            {"name": "additional_info_for_procurement", "label": "Additional Information/Questions for Procurement", "type": "text_area", "required": False, "placeholder": "e.g., Please identify potential vendors and advise on the anticipated timeline for this RFQ process."},
        ],
        "allowed_group_names": ["facilities_management_group"], # Placeholder
    },
    # 8. Clarification Required - Vendor Invoice Discrepancy
    {
        "name": "Clarification Required - Vendor Invoice Discrepancy",
        "description": "Request clarification from Finance regarding a vendor invoice discrepancy.",
        "category_name": "Procurement Issues", # New category
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "Finance Department - Accounts Payable", "readonly": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Procurement Department", "readonly": True},
            {"name": "memo_date", "label": "Memo Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "vendor_name_for_subject", "label": "Vendor Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., TechSolutions Co."},
            {"name": "invoice_number_for_subject", "label": "Invoice Number (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., INV2025-01123"},
            {"name": "invoice_date", "label": "Invoice Date", "type": "date", "required": True},
            {"name": "po_number", "label": "Purchase Order #", "type": "text_short", "required": True, "placeholder": "e.g., PO2025-7890"},
            {"name": "discrepancy_details", "label": "Description of Discrepancy", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Invoiced amount of $X exceeds PO amount $Y by $Z."},
            {"name": "action_requested", "label": "Action Requested from Finance", "type": "text_area", "required": True, "attributes": {"rows": 2}, "defaultValue": "Please investigate this variance with the vendor and advise on the correct amount before payment processing."},
            {"name": "attachment_description", "label": "Attached Documents (e.g., PO, Invoice)", "type": "text_area", "required": True, "placeholder": "e.g., Copy of PO and Invoice are attached for reference."},
        ],
        "allowed_group_names": ["procurement_department_group"],
    },
    # 9. Notification of Goods Received - High-Value Shipment
    {
        "name": "Notification of Goods Received - High-Value Shipment",
        "description": "Notify Finance and PMO of receipt of a high-value shipment.",
        "category_name": "Procurement Notifications",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients_description", "label": "To (e.g., Finance Department, Project Management Office)", "type": "text_area", "required": True},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Receiving Department", "readonly": True},
            {"name": "receipt_date", "label": "Date of Receipt", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "item_name_for_subject", "label": "Item Name (for Subject)", "type": "text_short", "required": True, "helpText": "e.g., Data Storage Array"},
            {"name": "po_number_for_subject", "label": "PO Number (for Subject)", "type": "text_short", "required": True, "placeholder": "e.g., PO2025-9876"},
            {"name": "vendor_name", "label": "Vendor Name", "type": "text_short", "required": True, "placeholder": "e.g., Global Tech Distributors"},
            {"name": "receipt_time", "label": "Time of Receipt", "type": "text_short", "required": False, "placeholder": "e.g., 11:00 AM"},
            {"name": "inspection_notes", "label": "Inspection Notes", "type": "text_area", "required": True, "attributes": {"rows": 2}, "defaultValue": "Shipment inspected and matches specifications on the purchase order."},
            {"name": "item_location", "label": "Current Location of Item", "type": "text_short", "required": False, "defaultValue": "Moved to secure IT storage facility for upcoming installation."},
            {"name": "action_for_finance", "label": "Action for Finance", "type": "text_short", "required": False, "defaultValue": "Please proceed with necessary payment processing."},
            {"name": "attachment_description_delivery_docs", "label": "Delivery Documentation (Attachment Description)", "type": "text_area", "required": True},
        ],
        "allowed_group_names": ["receiving_department_group", "finance_department_group", "pmo_group"], # Placeholders
    },
    # 10. Internal Audit Findings - Procurement Process Compliance
    {
        "name": "Internal Audit Findings - Procurement Process Compliance",
        "description": "Report internal audit findings related to procurement process compliance.",
        "category_name": "Procurement Policies/Audits",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipient", "label": "To (e.g., Head of Procurement)", "type": "text_short", "required": True, "placeholder": "Head of Procurement"},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Internal Audit Department", "readonly": True},
            {"name": "report_date", "label": "Report Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "audit_subject_for_subject", "label": "Audit Subject (for Subject)", "type": "text_short", "required": True, "defaultValue": "Non-Compliance in Vendor Selection for Minor Purchases"},
            {"name": "audit_period_or_scope", "label": "Audit Period/Scope", "type": "text_short", "required": True, "placeholder": "e.g., Q1 2025 Purchases under $500"},
            {"name": "key_finding_summary", "label": "Key Finding Summary", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Instances of non-compliance with 'three-quote' policy. X% of transactions lacked documented alternative quotes."},
            {"name": "associated_risk", "label": "Associated Risk", "type": "text_area", "required": False, "attributes": {"rows": 2}, "placeholder": "e.g., Risk of non-optimal pricing and transparency."},
            {"name": "recommendations", "label": "Recommendations", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Immediate retraining for relevant staff and review of internal approval workflow..."},
            {"name": "detailed_report_attachment_description", "label": "Detailed Audit Report (Attachment Description)", "type": "text_area", "required": True},
            {"name": "response_deadline", "label": "Deadline for Action Plan Response", "type": "date", "required": False},
        ],
        "allowed_group_names": ["internal_audit_group"], # Placeholder
    },

    # ==== GENERAL ITSM & OPERATIONS IOMS ====
    # 11. Scheduled System Maintenance Notification
    {
        "name": "Scheduled System Maintenance Notification",
        "description": "Notify users about scheduled system maintenance and downtime.",
        "category_name": "General IT & Operations",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Staff)", "type": "text_short", "required": True, "defaultValue": "All Staff"},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "IT Department", "readonly": True},
            {"name": "notification_date", "label": "Notification Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "system_name_for_subject", "label": "System Name (for Subject)", "type": "text_short", "required": True, "placeholder": "e.g., ERP System"},
            {"name": "maintenance_start_datetime", "label": "Maintenance Start (Date & Time)", "type": "datetime", "required": True},
            {"name": "maintenance_end_datetime", "label": "Maintenance End (Date & Time)", "type": "datetime", "required": True},
            {"name": "reason_for_maintenance", "label": "Reason for Maintenance", "type": "choice_single", "required": True, "options": [
                {"value": "security_updates", "label": "Security Updates"},
                {"value": "performance_enhancement", "label": "Performance Enhancement"},
                {"value": "new_feature_deployment", "label": "New Feature Deployment"},
                {"value": "general_maintenance", "label": "General Maintenance"},
                {"value": "other", "label": "Other (Specify)"},
            ]},
            {"name": "reason_other_details", "label": "If Other Reason, Specify", "type": "text_short", "required": False},
            {"name": "expected_impact", "label": "Expected Impact", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., System will be completely unavailable. Degraded performance expected."},
            {"name": "user_actions_required", "label": "User Actions Required (Optional)", "type": "text_area", "required": False, "attributes": {"rows": 2}, "placeholder": "e.g., Please save all work and log out before downtime."},
            {"name": "include_apology", "label": "Include Standard Apology for Inconvenience", "type": "boolean", "defaultValue": True},
        ],
        "allowed_group_names": ["it_department_group"],
    },
    # 12. New Employee Onboarding & IT Provisioning Request
    {
        "name": "New Employee Onboarding & IT Provisioning Request",
        "description": "Request IT provisioning and HR onboarding for a new employee.",
        "category_name": "HR & Admin",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_departments", "label": "To Departments", "type": "text_short", "required": True, "defaultValue": "IT Department - User Services, HR Department", "readonly": True},
            {"name": "from_manager_department", "label": "From (Hiring Manager's Department)", "type": "text_short", "required": True, "placeholder": "e.g., Sales Department"},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "employee_name_for_subject", "label": "New Employee Name (for Subject)", "type": "text_short", "required": True},
            {"name": "employee_start_date", "label": "Employee Start Date", "type": "date", "required": True},
            {"name": "employee_job_title", "label": "Employee Job Title", "type": "text_short", "required": True, "placeholder": "e.g., Sales Executive"},
            {"name": "reporting_manager", "label": "Reporting Manager", "type": "text_short", "required": True},
            {"name": "hardware_requirements", "label": "Hardware Requirements", "type": "text_area", "required": False, "attributes": {"rows": 2}, "defaultValue": "Standard hardware (laptop, monitor). Specify if different."},
            {"name": "software_access_requirements", "label": "Software/Access Requirements", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., MS Office 365, CRM access, Sales Analytics tool, network access."},
            {"name": "other_onboarding_notes", "label": "Other Onboarding Notes (Optional)", "type": "text_area", "required": False, "attributes": {"rows": 2}},
            {"name": "confirmation_contact", "label": "Contact for Confirmation", "type": "text_short", "required": False, "placeholder": "Your name/email if different from requester"},
        ],
        "allowed_group_names": ["managers_group", "hr_department_group"], # Placeholders
    },
    # 13. Request for Facilities Repair - HVAC System
    {
        "name": "Request for Facilities Repair - HVAC System",
        "description": "Request urgent repair for facilities equipment like HVAC.",
        "category_name": "Facilities Management",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "Facilities Management", "readonly": True},
            {"name": "from_department_or_person", "label": "From (Department/Person Reporting)", "type": "text_short", "required": True, "placeholder": "e.g., HR Department or Your Name"},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "issue_location_for_subject", "label": "Issue & Location (for Subject)", "type": "text_short", "required": True, "placeholder": "e.g., HVAC Malfunction on 3rd Floor, West Wing"},
            {"name": "issue_description", "label": "Description of Issue", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "e.g., Air conditioning has ceased functioning entirely..."},
            {"name": "time_issue_began", "label": "Approximate Time Issue Began", "type": "text_short", "required": False, "placeholder": "e.g., 10:00 AM today"},
            {"name": "impact_of_issue", "label": "Impact of Issue", "type": "text_area", "required": True, "attributes": {"rows": 2}, "placeholder": "e.g., Uncomfortable working conditions for X employees, productivity affected."},
            {"name": "urgency_level", "label": "Urgency", "type": "choice_single", "required": True, "defaultValue": "high", "options": [
                {"value": "high", "label": "High - Immediate Attention"},
                {"value": "medium", "label": "Medium - Same Day"},
                {"value": "low", "label": "Low - Next Business Day"},
            ]},
            {"name": "contact_person_for_followup", "label": "Contact Person for Follow-up", "type": "text_short", "required": False},
        ],
        "allowed_group_names": ["all_employees_group"],
    },
    # 14. Data Breach Incident Notification (Internal)
    {
        "name": "Data Breach Incident Notification (Internal)",
        "description": "Preliminary internal notification of a suspected data breach.",
        "category_name": "Security Incidents",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., Executive Leadership, Legal, IT Security)", "type": "text_area", "required": True, "placeholder": "List key stakeholders"},
            {"name": "from_person_role", "label": "From (Person & Role)", "type": "text_short", "required": True, "defaultValue": "Chief Information Security Officer (CISO)", "readonly": True},
            {"name": "notification_datetime", "label": "Notification Date & Time", "type": "datetime", "required": True, "auto_populate": "current_datetime"},
            {"name": "incident_type_for_subject", "label": "Incident Type (for Subject)", "type": "text_short", "required": True, "defaultValue": "CRITICAL INCIDENT: Preliminary Notification of Suspected Data Breach"},
            {"name": "detection_datetime", "label": "Time of Detection", "type": "datetime", "required": True},
            {"name": "affected_systems_summary", "label": "Affected Systems/Data Summary", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Unauthorized access attempts to a critical customer database."},
            {"name": "immediate_actions_taken", "label": "Immediate Actions Taken", "type": "text_area", "required": True, "attributes": {"rows": 3}, "defaultValue": "Immediate containment measures are underway, and the affected systems have been isolated. Investigation by IT Security Team and external forensics experts is ongoing."},
            {"name": "next_update_eta", "label": "Next Update ETA (Optional)", "type": "text_short", "required": False, "placeholder": "e.g., Within 2 hours, or As more information becomes available."},
            {"name": "standby_request", "label": "Standby Request", "type": "text_short", "required": False, "defaultValue": "All relevant stakeholders are requested to remain on standby."},
        ],
        "allowed_group_names": ["ciso_group", "it_security_group"], # Placeholders
    },
    # 15. Project Milestone Achievement
    {
        "name": "Project Milestone Achievement",
        "description": "Announce the successful completion of a project milestone. (Using 'Project Phoenix' as example from description).",
        "category_name": "Project Communications",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Project Stakeholders via PMO)", "type": "text_area", "required": True},
            {"name": "from_project_lead_role", "label": "From (Project Lead/Role)", "type": "text_short", "required": True, "placeholder": "e.g., Project Phoenix Lead"},
            {"name": "announcement_date", "label": "Announcement Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "project_name_for_subject", "label": "Project Name (for Subject)", "type": "text_short", "required": True, "defaultValue": "Project Phoenix"},
            {"name": "milestone_achieved_for_subject", "label": "Milestone Achieved (for Subject)", "type": "text_short", "required": True, "placeholder": "e.g., Successful Completion of Phase 1 - User Acceptance Testing (UAT)"},
            {"name": "milestone_details", "label": "Details of Milestone Achievement", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "e.g., All critical UAT scenarios executed with a 98% pass rate, and user feedback has been overwhelmingly positive."},
            {"name": "achievement_date", "label": "Date Milestone Achieved", "type": "date", "required": True},
            {"name": "acknowledgements", "label": "Acknowledgements (Optional)", "type": "text_area", "required": False, "attributes": {"rows": 2}, "placeholder": "e.g., Thanks to the dedicated efforts of the entire project team and UAT participants."},
            {"name": "next_phase_or_steps", "label": "Next Phase/Steps", "type": "text_area", "required": False, "attributes": {"rows": 2}, "placeholder": "e.g., We are now proceeding with Phase 2: Production Deployment planning."},
        ],
        "allowed_group_names": ["project_leads_group", "pmo_group"], # Placeholders
    },
    # 16. Employee Training Session Announcement - Cybersecurity Awareness
    {
        "name": "Employee Training Session Announcement - Cybersecurity Awareness",
        "description": "Announce a mandatory employee training session.",
        "category_name": "HR & Admin",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Employees)", "type": "text_short", "required": True, "defaultValue": "All Employees"},
            {"name": "from_departments", "label": "From (Departments)", "type": "text_short", "required": True, "defaultValue": "HR Department & IT Security Team", "readonly": True},
            {"name": "announcement_date", "label": "Announcement Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "training_topic_for_subject", "label": "Training Topic (for Subject)", "type": "text_short", "required": True, "defaultValue": "Mandatory Cybersecurity Awareness Training Session"},
            {"name": "training_purpose", "label": "Purpose of Training", "type": "text_area", "required": True, "attributes": {"rows": 2}, "defaultValue": "To further strengthen our organizational security posture, this session is crucial for all employees to understand the latest cyber threats, best practices for data protection, and our incident reporting procedures."},
            {"name": "training_date", "label": "Training Date", "type": "date", "required": True},
            {"name": "training_time_start", "label": "Training Start Time", "type": "text_short", "required": True, "placeholder": "e.g., 10:00 AM IST"},
            {"name": "training_time_end", "label": "Training End Time", "type": "text_short", "required": True, "placeholder": "e.g., 12:00 PM IST"},
            {"name": "training_location_venue", "label": "Training Location/Venue", "type": "text_short", "required": True, "placeholder": "e.g., Main Conference Hall or Online Meeting Link"},
            {"name": "attendance_requirement", "label": "Attendance Requirement", "type": "text_short", "required": False, "defaultValue": "Your attendance is compulsory."},
            {"name": "registration_details", "label": "Registration Details", "type": "text_area", "required": True, "attributes": {"rows": 2}, "placeholder": "e.g., Please register via the HR portal by July 10, 2025, to confirm your participation."},
        ],
        "allowed_group_names": ["hr_department_group", "it_security_group"], # Placeholders
    },
    # 17. Request for Travel Approval - International Conference
    {
        "name": "Request for Travel Approval - International Conference",
        "description": "Request approval for international travel for a conference.",
        "category_name": "HR & Admin",
        "approval_config": {"type": "advanced"}, # Needs Dept Head and Finance
        "fields_definition": [
            {"name": "to_approvers_description", "label": "To (e.g., Department Head, Finance Department)", "type": "text_area", "required": True, "placeholder": "Approvers determined by workflow rules"},
            {"name": "from_employee_department", "label": "From (Employee Name - Department)", "type": "text_short", "required": True, "placeholder": "e.g., Your Name - Marketing Department", "auto_populate": "current_user_department"}, # Conceptual
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "conference_name_for_subject", "label": "Conference Name (for Subject)", "type": "text_short", "required": True, "placeholder": "e.g., Global Marketing Summit 2025"},
            {"name": "conference_location", "label": "Conference Location (City, Country)", "type": "text_short", "required": True, "placeholder": "e.g., London, UK"},
            {"name": "conference_start_date", "label": "Conference Start Date", "type": "date", "required": True},
            {"name": "conference_end_date", "label": "Conference End Date", "type": "date", "required": True},
            {"name": "purpose_of_attendance", "label": "Purpose of Attendance / Benefit to Company", "type": "text_area", "required": True, "attributes": {"rows": 3}, "placeholder": "e.g., Insights into emerging marketing technologies and strategies. My attendance will significantly benefit our Q4 campaign planning and competitive analysis."},
            {"name": "estimated_airfare", "label": "Estimated Airfare (USD)", "type": "number", "required": False, "attributes": {"step": "0.01"}},
            {"name": "estimated_accommodation", "label": "Estimated Accommodation (USD)", "type": "number", "required": False, "attributes": {"step": "0.01"}},
            {"name": "conference_fee", "label": "Conference Fee (USD)", "type": "number", "required": False, "attributes": {"step": "0.01"}},
            {"name": "total_estimated_cost", "label": "Total Estimated Cost (USD)", "type": "number", "required": False, "attributes": {"step": "0.01"}, "readonly": True, "helpText": "Can be auto-calculated by form if supported."},
            {"name": "detailed_itinerary_attachment_description", "label": "Detailed Itinerary & Budget (Attachment Description)", "type": "text_area", "required": True},
            {"name": "approval_request_deadline", "label": "Desired Approval Date (Optional)", "type": "date", "required": False},
        ],
        "allowed_group_names": ["all_employees_group"],
    },
    # 18. HR Policy Update - Remote Work Guidelines
    {
        "name": "HR Policy Update - Remote Work Guidelines",
        "description": "Announce updates to the company's Remote Work Policy.",
        "category_name": "HR & Admin",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Employees)", "type": "text_short", "required": True, "defaultValue": "All Employees"},
            {"name": "from_department", "label": "From Department", "type": "text_short", "required": True, "defaultValue": "Human Resources Department", "readonly": True},
            {"name": "announcement_date", "label": "Announcement Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "policy_effective_date", "label": "Policy Effective Date", "type": "date", "required": True},
            {"name": "key_changes_summary", "label": "Summary of Key Policy Changes", "type": "text_area", "required": True, "attributes": {"rows": 4}, "placeholder": "e.g., Revised guidelines for hybrid work schedules, mandatory weekly check-ins for remote employees, and updated equipment provision policies."},
            {"name": "full_policy_document_location", "label": "Link or Location of Full Policy Document", "type": "text_area", "required": True, "placeholder": "e.g., The full updated policy document is available on the HR section of the company intranet."},
            {"name": "action_required_by_employees", "label": "Action Required by Employees", "type": "text_short", "required": False, "defaultValue": "Please review it thoroughly."},
            {"name": "contact_for_questions", "label": "Contact for Questions", "type": "text_short", "required": False, "defaultValue": "Questions can be directed to your HR Business Partner."},
        ],
        "allowed_group_names": ["hr_department_group"],
    },
    # 19. Office Relocation Notification - Chennai Office
    {
        "name": "Office Relocation Notification - Chennai Office",
        "description": "Announce office relocation to new premises.",
        "category_name": "Facilities Management",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_recipients", "label": "To (e.g., All Chennai Staff)", "type": "text_short", "required": True},
            {"name": "from_departments", "label": "From (Departments)", "type": "text_short", "required": True, "defaultValue": "Facilities Management & HR", "readonly": True},
            {"name": "announcement_date", "label": "Announcement Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "relocation_effective_date", "label": "Relocation Effective Date", "type": "date", "required": True},
            {"name": "new_office_address", "label": "New Office Address", "type": "text_area", "required": True, "attributes": {"rows": 2}, "placeholder": "[New Address]"},
            {"name": "reason_benefits_of_move", "label": "Reason/Benefits of the Move", "type": "text_area", "required": False, "attributes": {"rows": 3}, "placeholder": "e.g., Enhanced collaborative spaces, improved amenities, capacity for future growth."},
            {"name": "next_steps_information", "label": "Next Steps / Further Information", "type": "text_area", "required": True, "attributes": {"rows": 3}, "defaultValue": "Detailed moving schedules, packing guidelines, and new office access procedures will be shared in subsequent communications."},
            {"name": "transition_goal", "label": "Transition Goal", "type": "text_short", "required": False, "defaultValue": "We aim for a seamless transition with minimal disruption to operations."},
        ],
        "allowed_group_names": ["facilities_management_group", "hr_department_group"],
    },
    # 20. Data Center Outage Post-Mortem Report Request
    {
        "name": "Data Center Outage Post-Mortem Report Request",
        "description": "Request a post-mortem report following a data center outage.",
        "category_name": "General IT & Operations",
        "approval_config": {"type": "none"},
        "fields_definition": [
            {"name": "to_department", "label": "To Department", "type": "text_short", "required": True, "defaultValue": "IT Department - Infrastructure & Operations"},
            {"name": "from_person_role", "label": "From (Person/Role Making Request)", "type": "text_short", "required": True, "defaultValue": "Executive Leadership"},
            {"name": "request_date", "label": "Request Date", "type": "date", "required": True, "auto_populate": "current_date"},
            {"name": "outage_date_for_subject", "label": "Outage Date (for Subject)", "type": "date", "required": True, "helpText": "e.g., June 25th"},
            {"name": "outage_details_summary", "label": "Outage Details Summary", "type": "text_area", "required": True, "attributes": {"rows": 2}, "placeholder": "e.g., Unscheduled data center outage that occurred on June 25, 2025, impacting critical business services for 3 hours."},
            {"name": "report_requirements", "label": "Required Content for Post-Mortem Report", "type": "text_area", "required": True, "attributes": {"rows": 4}, "defaultValue": "The report should detail the root cause analysis, timeline of events, impact assessment, remediation actions taken, and preventive measures to avoid recurrence. Please include lessons learned."},
            {"name": "submission_deadline", "label": "Report Submission Deadline", "type": "date", "required": True},
            {"name": "next_steps_after_submission", "label": "Next Steps After Submission (Optional)", "type": "text_short", "required": False, "defaultValue": "A review meeting will be scheduled upon receipt."},
        ],
        "allowed_group_names": ["executive_leadership_group", "it_management_group"], # Placeholders
    }
]
