// src/components/Chat/ChatMessage.jsx - Friendly UI Version
import React, { useState } from 'react';

const ChatMessage = ({ message, isLoading = false }) => {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Safety check for message object
  if (!message || typeof message !== 'object') {
    return null;
  }

  const { type, content, timestamp, isError = false } = message;
  const isUser = type === 'user';
  const isAI = type === 'ai';

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return '';

    try {
      const timeObj = date instanceof Date ? date : new Date(date);
      return timeObj.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  // Format message content with line breaks and basic markdown-like formatting
  const formatContent = (text) => {
    if (!text || typeof text !== 'string') return '';

    return text.split('\n').map((line, index) => {
      // Simple formatting for code blocks
      if (line.trim().startsWith('```') && line.trim().endsWith('```')) {
        const code = line.trim().slice(3, -3);
        return (
          <div key={index} className="bg-gray-800 text-green-400 p-3 rounded-lg my-2 font-mono text-sm overflow-x-auto">
            {code}
          </div>
        );
      }

      // Simple formatting for inline code
      if (line.includes('`')) {
        const parts = line.split('`');
        return (
          <div key={index} className="mb-1">
            {parts.map((part, partIndex) =>
              partIndex % 2 === 1 ? (
                <code key={partIndex} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm font-mono">
                  {part}
                </code>
              ) : (
                <span key={partIndex}>{part}</span>
              )
            )}
          </div>
        );
      }

      return (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (navigator.clipboard && content) {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.log('Failed to copy to clipboard');
      }
    }
  };

  // Handle retry (placeholder)
  const handleRetry = () => {
    console.log('Retry message');
    // This would need to be implemented with proper retry logic
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Enhanced Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-4' : 'mr-4'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-2 border-white ${isUser
              ? 'bg-gradient-to-r from-blue-500 to-purple-600'
              : isError
                ? 'bg-gradient-to-r from-red-400 to-red-600'
                : 'bg-gradient-to-r from-green-400 to-blue-500'
            }`}>
            {isUser ? '👨‍💻' : isError ? '😵' : '🤖'}
          </div>

          {/* Avatar label */}
          <div className={`text-xs text-gray-500 mt-1 text-center ${isUser ? 'text-right' : 'text-left'
            }`}>
            {isUser ? 'คุณ' : isError ? 'ข้อผิดพลาด' : 'AI'}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          {/* Message Bubble */}
          <div className={`relative px-5 py-4 rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-200 hover:shadow-xl ${isUser
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-300'
              : isError
                ? 'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-red-200'
                : 'bg-white/80 text-gray-800 border-gray-200'
            }`}>
            {/* Loading indicator for AI */}
            {isLoading && isAI && (
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">AI กำลังคิด...</span>
                  <span className="text-xs text-gray-500">กรุณารอสักครู่</span>
                </div>
              </div>
            )}

            {/* Message content */}
            {!isLoading && (
              <div className="text-sm leading-relaxed">
                {formatContent(content)}
              </div>
            )}

            {/* Enhanced Message tail */}
            <div className={`absolute top-4 ${isUser
                ? 'right-0 transform translate-x-2'
                : 'left-0 transform -translate-x-2'
              }`}>
              <div className={`w-4 h-4 rotate-45 border ${isUser
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-300'
                  : isError
                    ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
                    : 'bg-white/80 border-gray-200'
                }`}></div>
            </div>
          </div>

          {/* Timestamp */}
          {timestamp && (
            <div className={`text-xs text-gray-400 mt-2 flex items-center gap-1 ${isUser ? 'flex-row-reverse' : 'flex-row'
              }`}>
              <span>🕐</span>
              <span>{formatTime(timestamp)}</span>
            </div>
          )}

          {/* Enhanced Message Actions */}
          {!isLoading && isAI && (
            <div className={`flex items-center space-x-3 mt-3 transition-all duration-200 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={copied}
                className="flex items-center space-x-2 text-xs text-gray-500 hover:text-blue-600 bg-white/70 hover:bg-blue-50 px-3 py-2 rounded-full border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                title="คัดลอกข้อความ"
              >
                {copied ? (
                  <>
                    <span className="text-green-500">✅</span>
                    <span className="text-green-600 font-medium">คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>คัดลอก</span>
                  </>
                )}
              </button>

              {/* Retry Button for errors */}
              {isError && (
                <button
                  onClick={handleRetry}
                  className="flex items-center space-x-2 text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-full border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="ลองใหม่"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>ลองใหม่</span>
                </button>
              )}

              {/* Like/Helpful Button */}
              {!isError && (
                <button
                  onClick={() => console.log('Message helpful')}
                  className="flex items-center space-x-2 text-xs text-gray-500 hover:text-green-600 bg-white/70 hover:bg-green-50 px-3 py-2 rounded-full border border-gray-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="ชอบคำตอบนี้"
                >
                  <span>👍</span>
                  <span>ชอบ</span>
                </button>
              )}
            </div>
          )}

          {/* User message actions */}
          {!isLoading && isUser && showActions && (
            <div className="flex items-center space-x-2 mt-2 opacity-60">
              <button
                onClick={() => console.log('Edit message')}
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center space-x-1 bg-white/70 px-2 py-1 rounded-full border border-gray-200 hover:border-blue-300 transition-all duration-200"
                title="แก้ไขข้อความ"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>แก้ไข</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reaction overlay for fun */}
      {copied && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
          <span className="flex items-center gap-2">
            <span>✅</span>
            <span className="text-sm font-medium">คัดลอกสำเร็จ!</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;