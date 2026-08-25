from app.schemas.agent_communication import ApprovalRequest, RiskLevel
class ApprovalManager:
    def __init__(self): self._pending = {}
    def create_request(self, action, risk, requester, resource=None):
        req = ApprovalRequest(action=action, risk_level=risk, requester=requester, resource=resource or {})
        self._pending[req.id] = req; return req
    def approve(self, rid, aid):
        req = self._pending.pop(rid, None)
        if req: req.approval_state = "approved"; req.approver = aid
        return req
    def reject(self, rid, aid):
        req = self._pending.pop(rid, None)
        if req: req.approval_state = "rejected"; req.approver = aid
        return req
    def get_pending(self): return list(self._pending.values())
approval_manager = ApprovalManager()
