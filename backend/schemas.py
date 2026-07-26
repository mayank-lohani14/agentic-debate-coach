from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class FallacyReportSchema(BaseModel):
    fallacy_detected: bool = Field(description="True ONLY if a fallacy is committed.")
    fallacy_type: str = Field(description="Must be 'Ad Hominem', 'Straw Man', 'False Dilemma', or 'None'.")
    offending_text: Optional[str] = Field(default=None, description="The broken phrase.")
    explanation: Optional[str] = Field(default=None, description="Why the reasoning failed.")
    counter_strategy: Optional[str] = Field(default=None, description="How to attack this error.")

class DebateTurnResponseSchema(BaseModel):
    user_transcript: str
    ai_rebuttal: str
    words_per_minute: int
    pace_status: str
    fallacy_metrics: Dict[str, Any]