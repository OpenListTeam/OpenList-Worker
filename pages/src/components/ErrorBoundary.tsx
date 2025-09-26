import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 你同样可以将错误日志上报给服务器
    console.error('Uncaught error:', error, errorInfo);
    // 保存错误信息到state
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // 你可以自定义降级后的 UI 并渲染
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'left', 
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            textAlign: 'center',
            color: '#d32f2f'
          }}>
            😔 应用程序出错了
          </div>
          
          {this.state.error && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                color: '#d32f2f'
              }}>
                错误信息:
              </div>
              <div style={{ 
                backgroundColor: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '15px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#d32f2f',
                marginBottom: '10px'
              }}>
                {this.state.error.name}: {this.state.error.message}
              </div>
              
              {this.state.error.stack && (
                <div>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    color: '#d32f2f'
                  }}>
                    错误堆栈:
                  </div>
                  <div style={{ 
                    backgroundColor: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: '15px',
                    padding: '10px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#d32f2f',
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}>
                    {this.state.error.stack}
                  </div>
                </div>
              )}
            </div>
          )}

          {this.state.errorInfo && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                color: '#d32f2f'
              }}>
                组件堆栈:
              </div>
              <div style={{ 
                backgroundColor: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '15px',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#d32f2f',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.errorInfo.componentStack}
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              重新加载应用
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;