"""
Thin Hugging Face hosted LLM client.

No local transformers / torch / sentence-transformers dependencies are used.
The model runs remotely through Hugging Face Inference Providers.
"""

from __future__ import annotations

from huggingface_hub import InferenceClient
from langchain_core.runnables import RunnableLambda

from app.config import get_settings


_settings = get_settings()

_client = InferenceClient(
    token=_settings.hf_token,
    provider=_settings.hf_provider,
)


def _convert_messages(prompt_value):
    """
    Convert a LangChain ChatPromptValue into the message format expected
    by Hugging Face's hosted chat-completion API.
    """

    messages = prompt_value.to_messages()

    converted = []

    for message in messages:
        if message.type == "system":
            role = "system"
        elif message.type == "human":
            role = "user"
        elif message.type == "ai":
            role = "assistant"
        else:
            role = "user"

        converted.append(
            {
                "role": role,
                "content": message.content,
            }
        )

    return converted


def _invoke_huggingface(prompt_value) -> str:
    """
    Send the rendered LangChain prompt to Hugging Face and return
    plain text so downstream LangChain output parsers can consume it.
    """

    messages = _convert_messages(prompt_value)

    response = _client.chat_completion(
        model=_settings.llm_model,
        messages=messages,
        temperature=_settings.llm_temperature,
        max_tokens=1200,
    )

    if not response.choices:
        raise RuntimeError("Hugging Face returned no response choices.")

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("Hugging Face returned an empty model response.")

    return content


def get_chat_model():
    """
    Return a LangChain-compatible Runnable backed by Hugging Face's
    hosted inference API.
    """

    return RunnableLambda(_invoke_huggingface)  