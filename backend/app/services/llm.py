"""
Single place that constructs the chat model used everywhere else.

Default: an open-weight instruct model served through HF Inference
Providers via langchain-huggingface. Swap to Claude/GPT by uncommenting
the alternates below -- nothing in prompts.py or the graph needs to
change, since they only depend on LangChain's ChatModel interface.
"""
from __future__ import annotations
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from app.config import get_settings

_settings = get_settings()


def get_chat_model():
    # Gotcha: HF's router picks a provider per `provider=`, and not every
    # provider serving a given model supports it for the same task. If you
    # see "Model X is not supported for task text-generation and provider Y",
    # open the model's page on huggingface.co -> "Inference Providers" panel
    # and pick a provider listed there explicitly (e.g. provider="together"),
    # instead of "auto".
    endpoint = HuggingFaceEndpoint(
        repo_id=_settings.llm_model,
        provider=_settings.hf_provider,
        huggingfacehub_api_token=_settings.hf_token,
        temperature=_settings.llm_temperature,
        max_new_tokens=1200,
    )
    return ChatHuggingFace(llm=endpoint)

    # --- Alternates (recommended if you want more reliable structured JSON
    # and better reasoning than a 7-8B open model gives you) ---
    #
    # from langchain_openai import ChatOpenAI
    # return ChatOpenAI(model="gpt-4o-mini", temperature=_settings.llm_temperature)
    #
    # from langchain_anthropic import ChatAnthropic
    # return ChatAnthropic(model="claude-sonnet-4-5", temperature=_settings.llm_temperature)
