# Canonical contracts

These are the frozen v1 contracts for Sprint 1. They are the reference point for backend schemas, frontend types, and engine-service adapters.

## API error

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Job status

```json
{
  "job_id": "uuid",
  "user_id": "uuid",
  "type": "form16_upload|cams_upload|tax_analysis|mf_analysis|score|fire",
  "status": "pending|processing|completed|failed",
  "result": {},
  "error": {
    "code": "string",
    "message": "string"
  },
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

## Form 16 extraction tiers

### Level 1 core

```json
{
  "salary": 0,
  "hra_received": 0,
  "rent_paid": 0,
  "tax_deducted": 0,
  "deductions": {
    "80C": 0,
    "80D": 0,
    "80CCD1B": 0
  }
}
```

### Level 2 extended

```json
{
  "lta": 0,
  "bonus": 0,
  "other_allowances": 0,
  "professional_tax": 0
}
```

### Level 3 advanced

```json
{
  "previous_employer_income": 0,
  "other_income": 0,
  "losses": 0
}
```

### Stored extraction payload

```json
{
  "type": "form16",
  "status": "complete|partial|invalid",
  "critical_ready": true,
  "raw_text_available": true,
  "data": {
    "level_1": {},
    "level_2": {},
    "level_3": {}
  },
  "missing_fields": ["deductions.80D"],
  "warnings": ["L2 fields missing, partial analysis still possible"]
}
```

## CAMS extraction payload

```json
{
  "type": "cams",
  "status": "complete|partial|invalid",
  "data": {
    "holdings": [
      {
        "fund_name": "string",
        "category": "string|null",
        "invested": 0,
        "current": 0,
        "purchase_date": "YYYY-MM-DD|null",
        "plan": "Direct|Regular|null"
      }
    ]
  },
  "missing_fields": ["holdings[0].plan"]
}
```

## Reviewed extraction payload

```json
{
  "document_id": "uuid",
  "type": "form16|cams",
  "raw_extracted_data": {},
  "reviewed_data": {},
  "review_status": "pending|completed"
}
```

## Normalized tax payload

```json
{
  "salary": 0,
  "basic": null,
  "hra_received": 0,
  "rent_paid": 0,
  "tax_deducted": 0,
  "deductions": {
    "80C": 0,
    "80D": 0,
    "80CCD1B": 0
  },
  "lta": null,
  "bonus": null,
  "other_allowances": null,
  "professional_tax": null,
  "previous_employer_income": null,
  "other_income": null,
  "losses": null
}
```

## Normalized MF payload

```json
{
  "holdings": [
    {
      "fund_name": "string",
      "category": "string|null",
      "invested": 0,
      "current": 0,
      "purchase_date": "YYYY-MM-DD|null",
      "plan": "Direct|Regular|null"
    }
  ]
}
```

## Tax analysis response

```json
{
  "summary": {
    "recommended_regime": "Old|New",
    "tax_payable": 0,
    "refund_or_payable": 0
  },
  "top_insights": [
    {
      "title": "string",
      "subtitle": "string",
      "impact": 0,
      "priority": "high|medium|low",
      "action": "string"
    }
  ],
  "full_report": {}
}
```

## MF analysis response

```json
{
  "summary": {
    "portfolio_value": 0,
    "portfolio_xirr": 0,
    "risk_profile": "conservative|moderate|aggressive"
  },
  "top_insights": [
    {
      "title": "string",
      "subtitle": "string",
      "impact": 0,
      "priority": "high|medium|low",
      "action": "string"
    }
  ],
  "full_report": {}
}
```

## Score response

```json
{
  "score": 0,
  "grade": "A|B|C|D|F",
  "dimensions": [],
  "changes": []
}
```

## FIRE input and response

### FIRE request

```json
{
  "current_age": 0,
  "target_retirement_age": 0,
  "monthly_income": 0,
  "monthly_expenses": 0,
  "current_corpus": 0,
  "monthly_sip": 0,
  "expected_annual_expense_at_retirement": 0,
  "return_rate": 0.12,
  "inflation": 0.06,
  "salary_growth": 0.08
}
```

### FIRE response

```json
{
  "retirement_age": 0,
  "yearly_plan": [],
  "corpus": {
    "required": 0,
    "projected": 0,
    "gap": 0
  }
}
```

## Engine service request

```json
{
  "mode": "tax|mf|score",
  "payload": {}
}
```

## Engine service response

```json
{
  "mode": "tax|mf|score",
  "result": {}
}
```
