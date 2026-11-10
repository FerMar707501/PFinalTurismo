import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import SourceList from '../components/SourceList.jsx';
import { InlineAlert, LoadingState } from '../components/States.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { formatNumber, formatRelative, truncate } from '../utils/format.js';

const SUGGESTIONS = [
  '¿Qué destinos de Guatemala recomiendas para una primera visita?',
  'Arma un plan de tres días en Antigua Guatemala para una pareja.',
  '¿Qué actividades hay en el lago de Atitlán para viajar con niños?',
  'Compara las playas de Monterrico con la selva de Tikal.',
];

export default function ChatPage() {
  const { token, quota, setQuota } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const didInit = useRef(false);

  async function refreshConversations() {
    if (!token) {
      return;
    }

    const result = await api.chat.conversations(
      { limit: 50, search: debouncedSearch || undefined },
      token,
    );
    setConversations(result.data);
  }

  async function selectConversation(conversation) {
    setActive(conversation);
    setMessages([]);
    setMessagesLoading(true);
    setError('');

    try {
      const result = await api.chat.conversation(
        conversation.id,
        { limit: 100 },
        token,
      );
      setActive(result.conversation);
      setMessages(result.messages);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    setConversationsLoading(true);

    api.chat
      .conversations(
        { limit: 50, search: debouncedSearch || undefined },
        token,
      )
      .then((result) => {
        if (cancelled) {
          return;
        }

        setConversations(result.data);

        if (!didInit.current) {
          didInit.current = true;
          if (result.data[0]) {
            selectConversation(result.data[0]);
          }
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConversationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // selectConversation se define en el componente y usa el token actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, debouncedSearch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  const startNewChat = () => {
    setActive(null);
    setMessages([]);
    setInput('');
    setError('');
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const sendMessage = async (text) => {
    const message = String(text ?? '').trim();

    if (!message || sending) {
      return;
    }

    if (quota?.exceeded) {
      setError(
        'Tu cuota mensual está agotada. El límite se renueva el ' +
          new Date(quota.resetAt).toLocaleDateString('es-GT') +
          '.',
      );
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setError('');
    setInput('');
    setSending(true);
    setMessages((current) => [...current, optimistic]);

    try {
      const result = await api.chat.send(
        {
          message,
          ...(active?.id ? { conversationId: active.id } : {}),
        },
        token,
      );

      setActive(result.conversation);
      setMessages((current) => [
        ...current.filter((item) => item.id !== tempId),
        result.userMessage,
        result.message,
      ]);
      setQuota(result.quota);
      await refreshConversations();
    } catch (requestError) {
      setMessages((current) => current.filter((item) => item.id !== tempId));
      setInput(message);
      setError(requestError.message);
      if (requestError.details?.limitTokens !== undefined) {
        setQuota(requestError.details);
      }
    } finally {
      setSending(false);
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="page-stack chat-page">
      <header className="page-head chat-page-head">
        <div>
          <span className="eyebrow">
            <Icon name="chat" size={14} /> Asistente con RAG
          </span>
            <h1>Conversa con RutaIA</h1>
            <p>
              Respuestas fundamentadas en el catálogo turístico de Guatemala, con
              memoria de la conversación y fuentes verificables.
            </p>
        </div>
        <div className="page-head-badge">
          <Icon name="shield" size={17} />
          {formatNumber(quota?.remainingTokens)} tokens disponibles
        </div>
      </header>

      <div className="chat-layout">
        <aside className="chat-sidebar panel">
          <div className="chat-sidebar-head">
            <strong>Conversaciones</strong>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={startNewChat}
            >
              <Icon name="plus" size={15} /> Nueva
            </button>
          </div>

          <label className="search-box chat-search">
            <Icon name="search" size={16} />
            <input
              className="input search-input"
              type="search"
              placeholder="Buscar conversación…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="conversation-list">
            {conversationsLoading ? (
              <LoadingState label="Cargando historial…" compact />
            ) : conversations.length === 0 ? (
              <p className="chat-empty-list">
                {search
                  ? 'No hay conversaciones que coincidan.'
                  : 'Aún no tienes conversaciones.'}
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  className={`conversation-item ${active?.id === conversation.id ? 'active' : ''}`.trim()}
                  onClick={() => selectConversation(conversation)}
                >
                  <span className="conversation-icon">
                    <Icon name="chat" size={16} />
                  </span>
                  <span className="conversation-copy">
                    <strong>{conversation.title || 'Conversación sin título'}</strong>
                    <small>
                      {truncate(conversation.lastMessage || 'Sin mensajes', 60)}
                    </small>
                    <span className="conversation-meta">
                      {formatRelative(
                        conversation.lastMessageAt || conversation.createdAt,
                      )}
                      {conversation.messageCount !== undefined
                        ? ` · ${conversation.messageCount} mensajes`
                        : ''}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="chat-panel panel">
          <header className="chat-panel-head">
            <div>
              <span className="chat-panel-kicker">
                <span className="live-dot" /> Servicio chat_rag
              </span>
              <strong>{active?.title || 'Nueva conversación'}</strong>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={startNewChat}
              title="Nueva conversación"
              aria-label="Nueva conversación"
            >
              <Icon name="edit" size={18} />
            </button>
          </header>

          <div className="chat-messages">
            {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

            {messagesLoading ? (
              <LoadingState label="Cargando mensajes…" />
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <span className="chat-welcome-icon">
                  <Icon name="sparkles" size={28} />
                </span>
                <h2>¿Qué quieres descubrir hoy?</h2>
                <p>
                  Pregunta por destinos, actividades, presupuestos o ideas de viaje.
                  El asistente buscará en el catálogo de Guatemala antes de responder.
                </p>
                <div className="suggestion-grid">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      className="suggestion-chip"
                      onClick={() => {
                        setInput(suggestion);
                        textareaRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message message-${message.role}`}
                  >
                    <span className="message-avatar" aria-hidden="true">
                      <Icon
                        name={message.role === 'assistant' ? 'bot' : 'user'}
                        size={17}
                      />
                    </span>
                    <div className="message-bubble">
                      <div className="message-meta">
                        <strong>
                          {message.role === 'assistant' ? 'RutaIA' : 'Tú'}
                        </strong>
                        <span>{formatRelative(message.createdAt)}</span>
                      </div>
                      {message.role === 'assistant' ? (
                        <RichText text={message.content} />
                      ) : (
                        <p className="message-text">{message.content}</p>
                      )}
                      {message.role === 'assistant' && message.sources?.length ? (
                        <SourceList sources={message.sources} />
                      ) : null}
                      {message.role === 'assistant' &&
                      (message.tokensIn || message.tokensOut) ? (
                        <div className="message-tokens">
                          <Icon name="gauge" size={13} />
                          {formatNumber(message.tokensIn)} entrada ·{' '}
                          {formatNumber(message.tokensOut)} salida
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
                {sending ? (
                  <div className="typing-row" aria-live="polite">
                    <span className="message-avatar">
                      <Icon name="bot" size={17} />
                    </span>
                    <span className="typing-bubble">
                      <span />
                      <span />
                      <span />
                      RutaIA está consultando el catálogo…
                    </span>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            {quota?.exceeded ? (
              <InlineAlert tone="danger">
                Cuota agotada. El servicio se reactivará automáticamente el{' '}
                {new Date(quota.resetAt).toLocaleDateString('es-GT')}.
              </InlineAlert>
            ) : null}
            <div className="composer-box">
              <textarea
                ref={textareaRef}
                className="textarea composer-input"
                rows={1}
                placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || quota?.exceeded}
              />
              <button
                type="submit"
                className="btn btn-primary composer-send"
                disabled={sending || !input.trim() || quota?.exceeded}
                aria-label="Enviar mensaje"
              >
                {sending ? (
                  <span className="spinner spinner-light" />
                ) : (
                  <Icon name="send" size={19} />
                )}
              </button>
            </div>
            <div className="composer-note">
              <span>
                <Icon name="shield" size={13} /> Las fuentes se citan en cada respuesta.
              </span>
              <span>{input.length}/2000</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
