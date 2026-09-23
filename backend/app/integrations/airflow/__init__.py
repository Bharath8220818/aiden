"""Airflow adapter — deploy, trigger, and monitor pipelines via the Airflow REST API.

Public façade: `AirflowService` (service.py). Frontend contracts stay in
`app/api/v1/pipelines.py`; nothing above this package imports Airflow details.
"""
