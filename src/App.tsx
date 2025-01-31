import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

// Types
interface User {
  id: number;
  nombre_usuario: string;
  imagen_perfil?: string;
}

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface Task {
  id: number;
  texto: string;
  fecha_tentiva_finalizacion?: string;
  estado: 'Sin Empezar' | 'Empezada' | 'Finalizada';
  category_id: number;
  fecha_creacion: string;
  user_id: number;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
} | null>(null);

const Toast: React.FC<{ toast: Toast | null }> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type} active`}>
      {toast.type === 'success' ? '✓' : '✕'}
      <span>{toast.message}</span>
    </div>
  );
};

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Error al iniciar sesión');

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      showToast('¡Sesión iniciada exitosamente!', 'success');
      return true;
    } catch (err) {
      console.error('Error de inicio de sesión:', err);
      showToast('Error al iniciar sesión. Por favor verifica tus credenciales.', 'error');
      return false;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre_usuario: username,
          contrasenia: password,
          imagen_perfil: null
        }),
      });

      if (!response.ok) throw new Error('Error en el registro');
      showToast('¡Registro exitoso! Por favor inicia sesión.', 'success');
      return true;
    } catch (err) {
      console.error('Error de registro:', err);
      showToast('Error en el registro. Por favor intenta nuevamente.', 'error');
      return false;
    }
  };
  

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    showToast('Sesión cerrada exitosamente', 'success');
  }, [showToast]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      <div className="app">
        <header className="header">
          <div className="header-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Gestor de Tareas
          </div>
          {token && (
            <div className="header-actions">
              <div className="user-menu">
                <div className="user-avatar">
                  {user?.nombre_usuario.charAt(0).toUpperCase()}
                </div>
                <button className="btn btn-danger" onClick={logout}>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="main-content">
          {token ? <TasksView /> : <AuthForms />}
        </main>

        <Toast toast={toast} />
      </div>
    </AuthContext.Provider>
  );
};

const AuthForms: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = useContext(AuthContext);

  if (!auth) throw new Error('Contexto de autenticación no encontrado');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('El nombre de usuario es requerido');
      return;
    }

    if (username.length > 50) {
      setError('El nombre de usuario debe tener menos de 50 caracteres');
      return;
    }

    if (!password) {
      setError('La contraseña es requerida');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      if (isLogin) {
        await auth.login(username, password);
      } else {
        if (await auth.register(username, password)) {
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error('Error en el envío del formulario:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Iniciar Sesión
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};

const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    nombre: '',
    descripcion: ''
  });
  const [newTask, setNewTask] = useState({
    texto: '',
    estado: 'Sin Empezar' as const,
    category_id: '',
    fecha_tentiva_finalizacion: ''
  });

  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Contexto de autenticación no encontrado');

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error al obtener tareas:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error al obtener categorías:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          ...newTask,
          category_id: Number(newTask.category_id)
        })
      });

      if (response.ok) {
        setShowNewTaskModal(false);
        fetchTasks();
        setNewTask({
          texto: '',
          estado: 'Sin Empezar',
          category_id: '',
          fecha_tentiva_finalizacion: ''
        });
      }
    } catch (err) {
      console.error('Error al crear tarea:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/categories/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        setShowCategoryModal(false);
        fetchCategories();
        setNewCategory({
          nombre: '',
          descripcion: ''
        });
      }
    } catch (err) {
      console.error('Error al crear categoría:', err);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: Task['estado']) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          estado: newStatus,
          fecha_tentiva_finalizacion: null,
          category_id: null
        })
      });

      if (response.ok) {
        fetchTasks(); // Refresh the task list
      }
    } catch (err) {
      console.error('Error al actualizar el estado:', err);
    }
  };

  const getStatusClass = (status: Task['estado']) => {
    switch (status) {
      case 'Sin Empezar': return 'status-pending';
      case 'Empezada': return 'status-in-progress';
      case 'Finalizada': return 'status-completed';
    }
  };

  return (
    <>
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total de Tareas</h3>
          <div className="value">{tasks.length}</div>
        </div>
        <div className="stat-card">
          <h3>En Progreso</h3>
          <div className="value">
            {tasks.filter(t => t.estado === 'Empezada').length}
          </div>
        </div>
        <div className="stat-card">
          <h3>Completadas</h3>
          <div className="value">
            {tasks.filter(t => t.estado === 'Finalizada').length}
          </div>
        </div>
      </div>

      <div className="tasks-header">
        <h2>Mis Tareas</h2>
        <div className="task-actions">
          <button
            className="btn btn-outline"
            onClick={() => setShowCategoryModal(true)}
          >
            Nueva Categoría
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewTaskModal(true)}
          >
            Agregar Nueva Tarea
          </button>
        </div>
      </div>
      

      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item">
            <div className="task-content">
              <h3 className="task-title">{task.texto}</h3>
              <span className="task-category">
                {categories.find(c => c.id === task.category_id)?.nombre}
              </span>
            </div>
            <div className="task-actions">
              <span className={`status-badge ${getStatusClass(task.estado)}`}>
                {task.estado}
              </span>
            </div>
            <div className="task-actions">
              <select
                className={`status-select ${getStatusClass(task.estado)}`}
                value={task.estado}
                onChange={(e) => handleStatusChange(task.id, e.target.value as Task['estado'])}
              >
                <option value="Sin Empezar">Sin Empezar</option>
                <option value="Empezada">Empezada</option>
                <option value="Finalizada">Finalizada</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {showCategoryModal && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Crear Nueva Categoría</h2>
              <button
                className="modal-close"
                onClick={() => setShowCategoryModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Nombre de la Categoría</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCategory.nombre}
                  onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  value={newCategory.descripcion}
                  onChange={(e) => setNewCategory({ ...newCategory, descripcion: e.target.value })}
                  maxLength={255}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Crear Categoría
              </button>
            </form>
          </div>
        </div>
      )}

      {showNewTaskModal && (
        <div className="modal-overlay active">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Crear Nueva Tarea</h2>
              <button
                className="modal-close"
                onClick={() => setShowNewTaskModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Descripción de la Tarea</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTask.texto}
                  onChange={(e) => setNewTask({ ...newTask, texto: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select
                  className="form-input"
                  value={newTask.category_id}
                  onChange={(e) => setNewTask({ ...newTask, category_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar Categoría</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha de Vencimiento</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newTask.fecha_tentiva_finalizacion}
                  onChange={(e) => setNewTask({
                    ...newTask,
                    fecha_tentiva_finalizacion: e.target.value
                  })}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Crear Tarea
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};


export default App;