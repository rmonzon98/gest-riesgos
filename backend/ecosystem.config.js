module.exports = {
  apps: [{
    name: 'riesgos',
    cwd: '/home/erpaws/ftp/files/riesgos/backend',
    script: 'index.js',
    node_args: '-r module-alias/register',
    env: { NODE_ENV: 'production', PORT: 3001 }
  }]
}