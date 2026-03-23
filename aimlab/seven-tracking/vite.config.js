import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'json-db-plugin',
      configureServer(server) {
        server.middlewares.use('/api/users', (req, res, next) => {
          const dbPath = path.resolve('db.json');
          
          if (req.method === 'GET') {
            const data = fs.existsSync(dbPath) ? fs.readFileSync(dbPath, 'utf-8') : '[]';
            res.setHeader('Content-Type', 'application/json');
            res.end(data || '[]');
          } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                let users = [];
                if (fs.existsSync(dbPath)) {
                  const fileData = fs.readFileSync(dbPath, 'utf-8');
                  if (fileData) users = JSON.parse(fileData);
                }
                const newUser = JSON.parse(body);
                
                const existingIndex = users.findIndex(u => u.username === newUser.username);
                if (existingIndex > -1) {
                  users[existingIndex] = { ...users[existingIndex], ...newUser };
                } else {
                  users.push(newUser);
                }
                
                fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, user: newUser }));
              } catch (e) {
                console.error("Erro no DB Plugin:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ]
});
