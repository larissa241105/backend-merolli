        // =================================================================
        // ||                       DEPENDÊNCIAS                        ||
        // =================================================================
        const express = require('express');
        const { Pool } = require('pg'); 
        const cors = require('cors');
        const bcrypt = require('bcrypt');
        const { v4: uuidv4 } = require('uuid');
        const app = express();
        const port = 3001; 
        // =================================================================
        // ||                       MIDDLEWARES                         ||
        // =================================================================
        const corsOptions = {
        origin: 'https://merollisoft.com.br'
        };

        app.use(cors(corsOptions));
            app.use(express.json());

        // =================================================================
        // ||                  CONFIGURAÇÃO DO BANCO DE DADOS             ||
        // =================================================================
     
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL, 
            ssl: {
                rejectUnauthorized: false
            }
        });

        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('Erro ao conectar ao banco de dados PostgreSQL:', err);
            } else {
                // Mudamos a mensagem para refletir que agora é PostgreSQL.
                console.log('Conectado com sucesso ao banco de dados PostgreSQL.');
            }
        });

        app.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        });

      
        module.exports = pool;
    // =================================================================
    // ||                      ROTA DE LOGIN (SEGURA)                 ||
    // =================================================================
    app.post('/api/login/analista', (req, res) => {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ message: 'CPF e senha são obrigatórios.' });
        }

        const cpfLimpo = usuario.replace(/\D/g, '');
        const query = 'SELECT * FROM analista WHERE cpf = ?';

        db.query(query, [cpfLimpo], async (err, results) => {
            if (err) {
                console.error("Erro ao buscar analista:", err);
                return res.status(500).json({ message: 'Erro interno no servidor.' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'CPF ou senha inválidos.' });
            }

            const analista = results[0];

            try {

                const senhaCorreta = await bcrypt.compare(senha, analista.senha);

                if (senhaCorreta) {
                    console.log(`Login (seguro) bem-sucedido para o analista: ${analista.nome}`);
                    const usuarioLogado = { nome: analista.nome, cpf: analista.cpf, role: 'analista' };
                    res.status(200).json({ message: 'Login de analista bem-sucedido!', user: usuarioLogado });
                } else {
                    console.log(`Tentativa de login falhou: Senha incorreta para o analista ${analista.nome}.`);
                    res.status(401).json({ message: 'CPF ou senha inválidos.' });
                }
            } catch (compareError) {
                console.error("Erro ao comparar senhas:", compareError);
                return res.status(500).json({ message: 'Erro de segurança interno.' });
            }
        });
    });

    // =================================================================
    // ||                   ROTAS DE CADASTRO (SEGURAS)               ||
    // =================================================================


    app.post('/cadastro-auxiliar', async (req, res) => {
        const { nome, cpf, data_nascimento, senha } = req.body;
        if (!nome || !cpf || !data_nascimento || !senha) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        try {
            const senhaHash = await bcrypt.hash(senha, 10);
            const query = 'INSERT INTO auxiliar (cpf, nome, data_nascimento, senha) VALUES (?, ?, ?, ?)';
            const values = [cpf.replace(/\D/g, ''), nome, data_nascimento, senhaHash];

            db.query(query, values, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'CPF já cadastrado.' });
                    return res.status(500).json({ message: 'Erro interno ao cadastrar auxiliar.' });
                }
                res.status(201).json({ message: 'Auxiliar cadastrado com sucesso!' });
            });
        } catch (e) { res.status(500).json({ message: 'Erro ao processar senha.' }) }
    });

    
    app.post('/cadastro-analista', async (req, res) => {
        const { nome, cpf, data_nascimento, senha } = req.body;
        if (!nome || !cpf || !data_nascimento || !senha) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        try {
            const senhaHash = await bcrypt.hash(senha, 10);
            const query = 'INSERT INTO analista (cpf, nome, data_nascimento, senha) VALUES (?, ?, ?, ?)';
            const values = [cpf.replace(/\D/g, ''), nome, data_nascimento, senhaHash];

            db.query(query, values, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'CPF já cadastrado.' });
                    return res.status(500).json({ message: 'Erro interno ao cadastrar analista.' });
                }
                res.status(201).json({ message: 'Analista cadastrado com sucesso!' });
            });
        } catch (e) { res.status(500).json({ message: 'Erro ao processar senha.' }) }
    });


    app.post('/cadastro-cliente', async (req, res) => {
        const { cnpj, razao_social, nome_fantasia, endereco, unidade, nome_responsavel, contato_responsavel, senha } = req.body;
        if (!cnpj || !razao_social || !senha) {
            return res.status(400).json({ message: 'CNPJ, Razão Social e Senha são obrigatórios.' });
        }

        try {
            const senhaHash = await bcrypt.hash(senha, 10);
            const query = 'INSERT INTO cliente (cnpj, razao_social, nome_fantasia, endereco, unidade, nome_responsavel, contato_responsavel, senha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            const values = [cnpj.replace(/\D/g, ''), razao_social, nome_fantasia, endereco, unidade, nome_responsavel, contato_responsavel, senhaHash];

            db.query(query, values, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Este CNPJ já está cadastrado.' });
                    return res.status(500).json({ message: 'Erro ao cadastrar cliente.' });
                }
                res.status(201).json({ message: 'Cliente cadastrado com sucesso!' });
            });
        } catch (e) { res.status(500).json({ message: 'Erro ao processar senha.' }) }
    });


    // =================================================================
    // ||                  ROTAS DE NEGÓCIO (PEDIDOS, OS)             ||
    // =================================================================

    app.get('/api/clientes/cnpj/:cnpj', (req, res) => {
        const { cnpj } = req.params;
        const query = 'SELECT razao_social, nome_fantasia FROM cliente WHERE cnpj = ?';
        db.query(query, [cnpj.replace(/\D/g, '')], (err, results) => {
            if (err) return res.status(500).json({ message: 'Erro no servidor.' });
            if (results.length > 0) return res.status(200).json(results[0]);
            res.status(404).json({ message: 'Cliente não encontrado.' });
        });
    });

    app.get('/api/auxiliares', (req, res) => {
    const query = 'SELECT id, nome FROM auxiliar ORDER BY nome ASC'; 

    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar auxiliares:', err);
            return res.status(500).json({ message: 'Erro interno ao buscar dados dos auxiliares.' });
        }
        res.status(200).json(results);
    });
});

 app.post('/api/pedidos', (req, res) => {
    const { cliente, cnpj_cliente, nomeResponsavel, contatoResponsavel, descricao, quantidadeTotalItens, quantidadeAtribuidaOS, precoUnidade, precoTotal } = req.body;

    if (!cnpj_cliente || !nomeResponsavel) {
        return res.status(400).json({ message: 'CNPJ e Nome do Responsável são obrigatórios.' });
    }

    const gerarNumeroPedido = () => {
        const agora = new Date();
        const ano = String(agora.getFullYear()).slice(-2); 
        const mes = String(agora.getMonth() + 1).padStart(2, '0'); 
        const dia = String(agora.getDate()).padStart(2, '0');
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const segundo = String(agora.getSeconds()).padStart(2, '0');
        return `${ano}${mes}${dia}${hora}${minuto}${segundo}`; 
    };
    
    const novoNumeroPedido = gerarNumeroPedido();

    const query = 'INSERT INTO pedido (numeroPedido, nomeCliente, CNPJ_Cliente, nomeResponsavel, contatoResponsavel, descricao, quantidadeTotal, quantidadeAtribuida, precoUnidade, precoTotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    
    const values = [novoNumeroPedido, cliente, cnpj_cliente.replace(/\D/g, ''), nomeResponsavel, contatoResponsavel, descricao, quantidadeTotalItens, quantidadeAtribuidaOS, precoUnidade, precoTotal];
    
    db.query(query, values, (err, result) => {
        if (err) {
            console.error(err); 
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ message: 'Erro: O CNPJ informado não pertence a um cliente cadastrado.' });
            }
            return res.status(500).json({ message: 'Erro interno ao cadastrar pedido.' });
        }
        res.status(201).json({ message: 'Pedido cadastrado com sucesso!', pedidoId: result.insertId, numeroPedido: novoNumeroPedido });
    });
});

    app.get('/api/clientes/details-and-orders/:cnpj', (req, res) => {
        const cnpjLimpo = req.params.cnpj.replace(/\D/g, '');
        if (!cnpjLimpo) return res.status(400).json({ message: 'CNPJ inválido.' });

        const responseData = { cliente: null, pedidos: [] };
        const clienteQuery = 'SELECT razao_social, nome_fantasia, unidade FROM cliente WHERE cnpj = ?';

        db.query(clienteQuery, [cnpjLimpo], (err, clienteResults) => {
            if (err) return res.status(500).json({ message: 'Erro no servidor ao buscar cliente.' });
            if (clienteResults.length === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
            responseData.cliente = clienteResults[0];

            const pedidosQuery = 'SELECT numeroPedido FROM pedido WHERE CNPJ_Cliente = ? ORDER BY numeroPedido DESC';
            db.query(pedidosQuery, [cnpjLimpo], (err, pedidosResults) => {
                if (err) return res.status(500).json({ message: 'Erro no servidor ao buscar pedidos.' });
                responseData.pedidos = pedidosResults;
                res.status(200).json(responseData);
            });
        });
    });

app.post('/api/os-produto/fracionado', (req, res) => {
    const osArray = req.body; 
    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const idAgrupador = uuidv4();

    db.beginTransaction(err => {
        if (err) {
            console.error("ERRO AO INICIAR TRANSAÇÃO:", err);
            return res.status(500).json({ message: 'Erro interno no servidor.', error: err.message });
        }

        const insertPromises = osArray.map(osData => {
            return new Promise((resolve, reject) => {
                const {
                    cnpj, cliente, unidade, numeroPedidoSelecionado,
                    quantidadeAuxiliarOs, idAuxiliarSelecionado, nomeAuxiliar,
                    quantidadeItens, descricao
                } = osData;

                if (!cnpj || !numeroPedidoSelecionado || !idAuxiliarSelecionado || !quantidadeItens) {
                    return reject({ status: 400, message: 'Dados incompletos em um dos itens da O.S.' });
                }

                const numero_os = `${numeroPedidoSelecionado}_00${idAuxiliarSelecionado}`;
                const cleanDescricao = descricao === '' ? null : descricao;

                const query = `
                    INSERT INTO os_produto (
                        id_agrupador_os,         -- Coluna nova
                        numero_os,
                        numero_pedido_origem, 
                        cnpj_cliente, 
                        nome_cliente, 
                        unidade_cliente, 
                        quantidade_auxiliar_os, 
                        nome_auxiliar,
                        quantidade_itens, 
                        descricao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    idAgrupador,              
                    numero_os,
                    numeroPedidoSelecionado,
                    cnpj.replace(/\D/g, ''),
                    cliente,
                    unidade,
                    parseInt(quantidadeAuxiliarOs, 10),
                    nomeAuxiliar,
                    parseInt(quantidadeItens, 10),
                    cleanDescricao
                ];

                db.query(query, values, (err, result) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return reject({ status: 409, message: `Erro: O Número de O.S. '${numero_os}' já existe.` });
                        }
                         if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                            return reject({ status: 404, message: 'Erro: O CNPJ ou o Pedido informado não existem.' });
                        }
                        return reject({ status: 500, message: 'Erro ao inserir O.S. no banco de dados.', error: err });
                    }
                    resolve(result);
                });
            });
        });

        Promise.all(insertPromises)
            .then(results => {
                db.commit(err => {
                    if (err) {
                        console.error("ERRO AO COMITAR TRANSAÇÃO:", err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Erro ao salvar os dados.', error: err.message });
                        });
                    }
                    res.status(201).json({ message: 'O.S. fracionadas cadastradas com sucesso!', createdCount: results.length });
                });
            })
            .catch(error => {
                db.rollback(() => {
                    console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error.error || error.message);
                    res.status(error.status || 500).json({ message: error.message });
                });
            });
    });
});


app.post('/api/os-dados/fracionado', (req, res) => {
    const osArray = req.body;

    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const idAgrupador = uuidv4();

    db.beginTransaction(err => {
        if (err) {
            console.error("ERRO AO INICIAR TRANSAÇÃO:", err);
            return res.status(500).json({ message: 'Erro interno no servidor.', error: err.message });
        }
    
        const insertPromises = osArray.map(osData => {
            return new Promise((resolve, reject) => {
                const {
                    cnpj, cliente, unidade, numeroPedidoSelecionado,
                    quantidadeAuxiliarOs, idAuxiliarSelecionado, nomeAuxiliar,
                    quantidadeItens, descricao
                } = osData;

                if (!cnpj || !numeroPedidoSelecionado || !idAuxiliarSelecionado || !quantidadeItens) {
                    return reject({ status: 400, message: 'Dados incompletos em um dos itens da O.S.' });
                }

                const numero_os = `${numeroPedidoSelecionado}_00${idAuxiliarSelecionado}`;
                const cleanDescricao = descricao === '' ? null : descricao;

                const query = `
                    INSERT INTO os_dados (
                        id_agrupador_os,         -- Coluna nova
                        numero_os,
                        numero_pedido_origem, 
                        cnpj_cliente, 
                        nome_cliente, 
                        unidade_cliente, 
                        quantidade_auxiliar_os, 
                        nome_auxiliar,
                        quantidade_itens, 
                        descricao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    idAgrupador,             
                    numero_os,
                    numeroPedidoSelecionado,
                    cnpj.replace(/\D/g, ''),
                    cliente,
                    unidade,
                    parseInt(quantidadeAuxiliarOs, 10),
                    nomeAuxiliar,
                    parseInt(quantidadeItens, 10),
                    cleanDescricao
                ];

                db.query(query, values, (err, result) => {
                    if (err) {

                        if (err.code === 'ER_DUP_ENTRY') {
                            return reject({ status: 409, message: `Erro: O Número de O.S. '${numero_os}' já existe.` });
                        }
                         if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                            return reject({ status: 404, message: 'Erro: O CNPJ ou o Pedido informado não existem.' });
                        }
                        return reject({ status: 500, message: 'Erro ao inserir O.S. no banco de dados.', error: err });
                    }
                    resolve(result);
                });
            });
        });

        Promise.all(insertPromises)
            .then(results => {

                db.commit(err => {
                    if (err) {
                        console.error("ERRO AO COMITAR TRANSAÇÃO:", err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Erro ao salvar os dados.', error: err.message });
                        });
                    }
                    res.status(201).json({ message: 'O.S. cadastradas com sucesso!', createdCount: results.length });
                });
            })
            .catch(error => {
                
                db.rollback(() => {
                    console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error.error || error.message);
                    res.status(error.status || 500).json({ message: error.message });
                });
            });
    });
});


app.post('/api/os-conciliacao/fracionado', (req, res) => {
    const osArray = req.body; 
    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const idAgrupador = uuidv4();

    db.beginTransaction(err => {
        if (err) {
            console.error("ERRO AO INICIAR TRANSAÇÃO:", err);
            return res.status(500).json({ message: 'Erro interno no servidor.', error: err.message });
        }

        // Usaremos Promise.all para processar todas as inserções
        const insertPromises = osArray.map(osData => {
            return new Promise((resolve, reject) => {
                const {
                    cnpj, cliente, unidade, numeroPedidoSelecionado,
                    quantidadeAuxiliarOs, idAuxiliarSelecionado, nomeAuxiliar,
                    quantidadeItens, descricao
                } = osData;

                // Validação de cada item do array
                if (!cnpj || !numeroPedidoSelecionado || !idAuxiliarSelecionado || !quantidadeItens) {
                    return reject({ status: 400, message: 'Dados incompletos em um dos itens da O.S.' });
                }

                const numero_os = `${numeroPedidoSelecionado}_00${idAuxiliarSelecionado}`;
                const cleanDescricao = descricao === '' ? null : descricao;

                const query = `
                    INSERT INTO os_conciliacao (
                        id_agrupador_os,         -- Coluna nova
                        numero_os,
                        numero_pedido_origem, 
                        cnpj_cliente, 
                        nome_cliente, 
                        unidade_cliente, 
                        quantidade_auxiliar_os, 
                        nome_auxiliar,
                        quantidade_itens, 
                        descricao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    idAgrupador,              
                    numero_os,
                    numeroPedidoSelecionado,
                    cnpj.replace(/\D/g, ''),
                    cliente,
                    unidade,
                    parseInt(quantidadeAuxiliarOs, 10),
                    nomeAuxiliar,
                    parseInt(quantidadeItens, 10),
                    cleanDescricao
                ];

                db.query(query, values, (err, result) => {
                    if (err) {
                      
                        if (err.code === 'ER_DUP_ENTRY') {
                            return reject({ status: 409, message: `Erro: O Número de O.S. '${numero_os}' já existe.` });
                        }
                         if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                            return reject({ status: 404, message: 'Erro: O CNPJ ou o Pedido informado não existem.' });
                        }
                        return reject({ status: 500, message: 'Erro ao inserir O.S. no banco de dados.', error: err });
                    }
                    resolve(result);
                });
            });
        });

      
        Promise.all(insertPromises)
            .then(results => {
             //commit de transação, caso ocorra tudo ok 
                db.commit(err => {
                    if (err) {
                        console.error("ERRO AO COMITAR TRANSAÇÃO:", err);
                        return db.rollback(() => {
                            res.status(500).json({ message: 'Erro ao salvar os dados.', error: err.message });
                        });
                    }
                    res.status(201).json({ message: 'O.S. cadastradas com sucesso!', createdCount: results.length });
                });
            })
            .catch(error => {
                
                db.rollback(() => {
                    console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error.error || error.message);
                    res.status(error.status || 500).json({ message: error.message });
                });
            });
    });
});



    // =================================================================
    // ||                ROTAS DE VISUALIZAÇÃO GERAL                  ||
    // =================================================================

    
    app.get('/visualizarauxiliar', (req, res) => {
        const query = 'SELECT nome, cpf, data_nascimento FROM auxiliar'; 
        db.query(query, (err, data) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            return res.status(200).json(data);
        });
    });

    app.get('/visualizaranalista', (req, res) => {
        const query = 'SELECT nome, cpf, data_nascimento FROM analista'; 
        db.query(query, (err, data) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            return res.status(200).json(data);
        });
    });

    app.get('/visualizarcliente', (req, res) => {
        const query = 'SELECT razao_social, nome_responsavel, contato_responsavel, nome_fantasia, cnpj, unidade, endereco FROM cliente';
        db.query(query, (err, data) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            return res.status(200).json(data);
        });
    });

    app.get('/visualizarpedido', (req, res) => {
        const query = `SELECT p.numeroPedido, p.nomeCliente, p.quantidadeTotal, p.quantidadeAtribuida, DATE_FORMAT(p.data_inicio, '%d/%m/%Y %H:%i') AS data_formatada, c.razao_social, c.unidade FROM pedido AS p INNER JOIN cliente AS c ON p.CNPJ_Cliente = c.cnpj where concluida = false;`;
        db.query(query, (err, data) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            return res.status(200).json(data);
        });
    });

  app.get('/visualizarosproduto', (req, res) => {
    const query = `
        SELECT 
            od.numero_os, od.id_os, od.nome_cliente, c.razao_social,
            od.nome_auxiliar, od.quantidade_itens, od.descricao,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada
        FROM 
            os_produto AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = FALSE  
        ORDER BY od.id_os DESC;
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_produto' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});




app.get('/visualizarosdados', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.numero_os, od.nome_cliente, c.razao_social,
            od.nome_auxiliar, od.quantidade_itens, od.descricao,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada
        FROM 
            os_dados AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = FALSE  
        ORDER BY od.id_os DESC;
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_dados' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});


app.get('/visualizarosconciliacao', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.numero_os, od.nome_cliente, c.razao_social,
         od.quantidade_itens, od.descricao, od.nome_auxiliar,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada
        FROM 
            os_conciliacao AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = FALSE  
        ORDER BY od.id_os DESC;
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_dados' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});


    // =================================================================
    // ||                ROTAS DE GERENCIAMENTO (CRUD)                ||
    // =================================================================

    // --- Gerenciamento de Auxiliar por CPF ---
    app.get('/visualizarauxiliar/:cpf', (req, res) => {
        const query = 'SELECT nome, cpf, data_nascimento FROM auxiliar WHERE cpf = ?';
        db.query(query, [req.params.cpf], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (results.length === 0) return res.status(404).json({ message: "Auxiliar não encontrado." });
            return res.status(200).json(results[0]);
        });
    });

    app.put('/editar-auxiliar/:cpf', (req, res) => {
        const { nome, cpf, data_nascimento } = req.body;
        if (!nome || !cpf || !data_nascimento) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        const query = 'UPDATE auxiliar SET nome = ?, cpf = ?, data_nascimento = ? WHERE cpf = ?';
        db.query(query, [nome, cpf, data_nascimento, req.params.cpf], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'CPF já pertence a outro usuário.' });
                return res.status(500).json({ message: 'Erro interno no servidor.' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Auxiliar não encontrado.' });
            res.status(200).json({ message: 'Auxiliar atualizado com sucesso!' });
        });
    });

    app.delete('/deletar-auxiliar/:cpf', (req, res) => {
        const query = 'DELETE FROM auxiliar WHERE cpf = ?';
        db.query(query, [req.params.cpf], (err, result) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Auxiliar não encontrado." });
            res.status(200).json({ message: 'Auxiliar deletado com sucesso!' });
        });
    });

    // --- Gerenciamento de Analista por CPF ---
    app.get('/visualizaranalista/:cpf', (req, res) => {
        const query = 'SELECT nome, cpf, data_nascimento FROM analista WHERE cpf = ?';
        db.query(query, [req.params.cpf], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (results.length === 0) return res.status(404).json({ message: "Analista não encontrado." });
            return res.status(200).json(results[0]);
        });
    });

    app.put('/editar-analista/:cpf', (req, res) => {
        const { nome, cpf, data_nascimento } = req.body;
        if (!nome || !cpf || !data_nascimento) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        const query = 'UPDATE analista SET nome = ?, cpf = ?, data_nascimento = ? WHERE cpf = ?';
        db.query(query, [nome, cpf, data_nascimento, req.params.cpf], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'CPF já pertence a outro usuário.' });
                return res.status(500).json({ message: 'Erro interno no servidor.' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Analista não encontrado.' });
            res.status(200).json({ message: 'Analista atualizado com sucesso!' });
        });
    });
        
    app.delete('/deletar-analista/:cpf', (req, res) => {
        const query = 'DELETE FROM analista WHERE cpf = ?';
        db.query(query, [req.params.cpf], (err, result) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (result.affectedRows === 0) return res.status(404).json({ message: "Analista não encontrado." });
            res.status(200).json({ message: 'Analista deletado com sucesso!' });
        });
    });

    // --- Gerenciamento de Cliente por CNPJ ---
    app.get('/visualizarcliente/:cnpj', (req, res) => {
        const query = 'SELECT nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel FROM cliente WHERE cnpj = ?';
        db.query(query, [req.params.cnpj], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (results.length === 0) return res.status(404).json({ message: "Cliente não encontrado." });
            return res.status(200).json(results[0]);
        });
    });

    app.put('/editar-cliente/:cnpj', (req, res) => {
        const { nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel } = req.body;
        if (!nome_fantasia || !cnpj || !unidade || !endereco) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        const query = 'UPDATE cliente SET nome_fantasia = ?, cnpj = ?, unidade = ?, endereco = ?, razao_social = ?, nome_responsavel = ?, contato_responsavel = ? WHERE cnpj = ?';
        db.query(query, [nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel, req.params.cnpj], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'CNPJ já pertence a outro cliente.' });
                return res.status(500).json({ message: 'Erro interno no servidor.' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
            res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
        });
    });


app.delete('/deletar-cliente/:cnpj', (req, res) => {
    const { cnpj } = req.params;

    const checkPedidosQuery = 'SELECT COUNT(*) AS total FROM pedido WHERE CNPJ_Cliente = ?';
    
    db.query(checkPedidosQuery, [cnpj], (err, results) => {
        if (err) {
            console.error("Erro ao verificar pedidos do cliente:", err);
            return res.status(500).json({ message: "Erro interno no servidor ao verificar os pedidos." });
        }

        const pedidosCount = results[0].total;

        if (pedidosCount > 0) {
            return res.status(409).json({ 
                message: `Este cliente não pode ser excluído, pois possui ${pedidosCount} pedido(s) vinculado(s).` 
            });
        }

        const deleteQuery = 'DELETE FROM cliente WHERE cnpj = ?';

        db.query(deleteQuery, [cnpj], (deleteErr, deleteResult) => {
            if (deleteErr) {
                return res.status(500).json({ message: "Erro interno no servidor ao deletar o cliente." });
            }
            if (deleteResult.affectedRows === 0) {
                return res.status(404).json({ message: "Cliente não encontrado." });
            }
            res.status(200).json({ message: 'Cliente deletado com sucesso!' });
        });
    });
});

    app.get('/api/pedidos/:numeroPedido', (req, res) => {
    const { numeroPedido } = req.params;
    const query = 'SELECT * FROM pedido WHERE numeroPedido = ?';

    db.query(query, [numeroPedido], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json(result[0]);
     });
    });


// ROTA PUT PARA ATUALIZAR UM PEDIDO EXISTENTE
    app.put('/api/pedidos/:numeroPedido', (req, res) => {
    const { numeroPedido: paramNumeroPedido } = req.params;
    const { 
        cliente, 
        cnpj_cliente, 
        nomeResponsavel, 
        contatoResponsavel, 
        descricao, 
        quantidadeTotalItens, 
        quantidadeAtribuidaOS, 
        precoUnidade, 
        precoTotal 
    } = req.body;

    // Validação básica
    if (!cliente || !cnpj_cliente || !nomeResponsavel) {
        return res.status(400).json({ message: 'Cliente, CNPJ e Responsável são obrigatórios.' });
    }

    const query = `
        UPDATE pedido SET 
            nomeCliente = ?, 
            CNPJ_Cliente = ?, 
            nomeResponsavel = ?, 
            contatoResponsavel = ?, 
            descricao = ?, 
            quantidadeTotal = ?, 
            quantidadeAtribuida = ?, 
            precoUnidade = ?, 
            precoTotal = ? 
        WHERE numeroPedido = ?
    `;

  
    const values = [
        cliente, 
        cnpj_cliente.replace(/\D/g, ''), 
        nomeResponsavel, 
        contatoResponsavel, 
        descricao, 
        quantidadeTotalItens, 
        quantidadeAtribuidaOS, 
        precoUnidade, 
        precoTotal,
        paramNumeroPedido 
    ];

    db.query(query, values, (err, result) => {
        if (err) {
         
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ message: 'Erro: O CNPJ informado não pertence a um cliente cadastrado.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar o pedido.', error: err });
        }
      
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json({ message: 'Pedido atualizado com sucesso!' });
    });
});



    app.delete('/api/pedidos/:numeroPedido', (req, res) => {
        const { numeroPedido } = req.params;
     
    
        const checkOsQuery = `
            SELECT COUNT(*) AS total FROM (
                SELECT numero_pedido_origem FROM os_produto WHERE numero_pedido_origem = ?
                UNION ALL
                SELECT numero_pedido_origem FROM os_conciliacao WHERE numero_pedido_origem = ?
                UNION ALL
                SELECT numero_pedido_origem FROM os_dados WHERE numero_pedido_origem = ?
            ) AS combined_os
        `;
    
        const params = [
            numeroPedido, 
            numeroPedido,
            numeroPedido
        ];

        db.query(checkOsQuery, params, (err, results) => {
            if (err) {
                console.error("Erro ao verificar O.S. vinculadas:", err);
                return res.status(500).json({ message: "Erro interno no servidor ao verificar as O.S." });
            }

            const openOsCount = results[0].total;

            if (openOsCount > 0) {
                return res.status(409).json({
                    message: `Este pedido não pode ser excluído, pois possui ${openOsCount} Ordem(ns) de Serviço vinculados a esse pedido.`
                });
            }
            
            const deleteQuery = 'DELETE FROM pedido WHERE numeroPedido = ? ';
            db.query(deleteQuery, [numeroPedido], (deleteErr, deleteResult) => {
                if (deleteErr) {
                    return res.status(500).json({ message: "Erro interno no servidor ao deletar o pedido." });
                }
                if (deleteResult.affectedRows === 0) {
                    return res.status(404).json({ message: "Pedido não encontrado." });
                }
                res.status(200).json({ message: 'Pedido deletado com sucesso!' });
            });
        });
    });

    app.get('/api/os-produto/:id_os', (req, res) => {
       
        const { id_os } = req.params;
        const query = 'SELECT * FROM os_produto WHERE id_os = ?';

        db.query(query, [id_os], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Erro interno no servidor.' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
            }
            res.status(200).json(result[0]);
        });
    });


    app.put('/api/os-produto/:id_os', (req, res) => {
        const { id_os } = req.params;
    
        const { 
            numero_pedido_origem,
            cnpj_cliente,
            nome_cliente,
            unidade_cliente,
            id_auxiliar, 
            nome_auxiliar,
            descricao,
            quantidade_itens
        } = req.body;

        if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
            return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
        }

        const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

        const query = `
            UPDATE os_produto SET 
                numero_os = ?,
                numero_pedido_origem = ?,
                cnpj_cliente = ?,
                nome_cliente = ?,
                unidade_cliente = ?,
                nome_auxiliar = ?,
                descricao = ?,
                quantidade_itens = ?
            WHERE id_os = ?
        `;

        const values = [
            novo_numero_os,
            numero_pedido_origem,
            cnpj_cliente.replace(/\D/g, ''),
            nome_cliente,
            unidade_cliente,
            nome_auxiliar,
            descricao,
            quantidade_itens,
            id_os 
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error("Erro ao atualizar O.S. de Produto:", err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
                }
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
                }
                return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
            }
            res.status(200).json({ message: 'Ordem de Serviço atualizada com sucesso!' });
        });
    });


    app.delete('/api/os-produto/:id_os', (req, res) => {

        const { id_os } = req.params;

        const query = 'DELETE FROM os_produto WHERE id_os = ?';

        db.query(query, [id_os], (err, result) => {
            if (err) {
            
                return res.status(500).json({ message: "Erro interno no servidor ao deletar a OS." });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
            }
            
            res.status(200).json({ message: 'Ordem de Serviço deletada com sucesso!' });
        });
    });



app.get('/api/os-dados/:id_os', (req, res) => {

    const { id_os } = req.params;
    const query = 'SELECT * FROM os_dados WHERE id_os = ?';

    db.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json(result[0]);
    });
});

app.get('/api/os-conciliacao/:id_os', (req, res) => {
  
    const { id_os } = req.params;
    const query = 'SELECT * FROM os_conciliacao WHERE id_os = ?';

    db.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json(result[0]);
    });
});



app.put('/api/os-dados/:id_os', (req, res) => {
    const { id_os } = req.params;
    
    const { 
        numero_pedido_origem,
        cnpj_cliente,
        nome_cliente,
        unidade_cliente,
        id_auxiliar, 
        nome_auxiliar,
        descricao,
        quantidade_itens
    } = req.body;

    // Validação
    if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
        return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
    }

    const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

    const query = `
        UPDATE os_dados SET 
            numero_os = ?,
            numero_pedido_origem = ?,
            cnpj_cliente = ?,
            nome_cliente = ?,
            unidade_cliente = ?,
            nome_auxiliar = ?,
            descricao = ?,
            quantidade_itens = ?

        WHERE id_os = ?
    `;


    const values = [
        novo_numero_os,
        numero_pedido_origem,
        cnpj_cliente.replace(/\D/g, ''),
        nome_cliente,
        unidade_cliente,
        nome_auxiliar,
        descricao,
        quantidade_itens,
        id_os 
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Erro ao atualizar O.S. de Dados:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
            }
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json({ message: 'Ordem de Serviço atualizada com sucesso!' });
    });
});


// ROTA PUT PARA ATUALIZAR UMA ORDEM DE SERVIÇO DE CONCILIAÇÃO
    app.put('/api/os-conciliacao/:id_os', (req, res) => {
    const { id_os } = req.params;
    
    const { 
        numero_pedido_origem,
        cnpj_cliente,
        nome_cliente,
        unidade_cliente,
        id_auxiliar, 
        nome_auxiliar,
        descricao,
        quantidade_itens

    } = req.body;

    if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
        return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
    }

    const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

    const query = `
        UPDATE os_conciliacao SET 
            numero_os = ?,
            numero_pedido_origem = ?,
            cnpj_cliente = ?,
            nome_cliente = ?,
            unidade_cliente = ?,
            nome_auxiliar = ?,
            descricao = ?,
            quantidade_itens = ?
        WHERE id_os = ?
    `;


    const values = [
        novo_numero_os,
        numero_pedido_origem,
        cnpj_cliente.replace(/\D/g, ''),
        nome_cliente,
        unidade_cliente,
        nome_auxiliar,
        descricao,
        quantidade_itens,
        id_os 
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Erro ao atualizar O.S.:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
            }
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json({ message: 'Ordem de Serviço atualizada com sucesso!' });
    });
});



app.delete('/api/os-dados/:id_os', (req, res) => {
    // Pega o ID da OS a partir dos parâmetros da URLk
    const { id_os } = req.params;

    const query = 'DELETE FROM os_dados WHERE id_os = ?';

    db.query(query, [id_os], (err, result) => {
        if (err) {


            return res.status(500).json({ message: "Erro interno no servidor ao deletar a OS." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
        }

        res.status(200).json({ message: 'Ordem de Serviço deletada com sucesso!' });
});

});

app.delete('/api/os-conciliacao/:id_os', (req, res) => {

    const { id_os } = req.params;

    const query = 'DELETE FROM os_conciliacao WHERE id_os = ?';

    db.query(query, [id_os], (err, result) => {
        if (err) {
           
            return res.status(500).json({ message: "Erro interno no servidor ao deletar a OS." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
        }
 
        res.status(200).json({ message: 'Ordem de Serviço deletada com sucesso!' });
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////











    // --- GERENCIAMENTO DE PEDIDO ---

     // --- Gerenciamento de Cliente por CNPJ ---
    app.get('/visualizarpedido/:numeroPedido', (req, res) => {
        const query = 'SELECT numeroPedido, nomeCliente, CNPJ_Cliente, descricao, quantidadeTotal, quantidadeAtribuida, precoUnidade, precoTotal, nomeResponsavel, contatoResponsavel FROM pedido WHERE numeroPedido = ?';
        db.query(query, [req.params.numeroPedido], (err, results) => {
            if (err) return res.status(500).json({ message: "Erro interno no servidor." });
            if (results.length === 0) return res.status(404).json({ message: "Pedido não encontrado." });
            return res.status(200).json(results[0]);
        });
    });





    // =================================================================
    // ||                     o.s concluidas                          ||
    // =================================================================

    app.put('/os-produto-concluida', (req, res) => {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Nenhum ID fornecido para encerramento.' });
        }

        const query = "UPDATE os_produto SET concluida = true, data_conclusao = NOW() WHERE id_os IN (?)";

        db.query(query, [ids], (err, result) => {
            if (err) {
                console.error("Erro ao encerrar O.S.:", err);
                return res.status(500).json({ error: 'Erro interno no servidor.' });
            }
            res.status(200).json({ message: 'Ordens de Serviço encerradas com sucesso.' });
        });
    });

    app.get('/os-produto-concluida', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.numero_os,
             od.nome_cliente, c.razao_social,
            od.quantidade_auxiliar_os, od.quantidade_itens, od.descricao,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada,
            DATE_FORMAT(od.data_conclusao, '%d/%m/%Y %H:%i') AS data_conclusao_formatada -- Data de conclusão
        FROM 
            os_produto AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE -- Apenas as concluídas
        ORDER BY od.data_conclusao DESC; -- Ordena pelas mais recentes
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});

    app.put('/os-dados-concluida', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido para encerramento.' });
    }

    const query = "UPDATE os_dados SET concluida = TRUE, data_conclusao = NOW() WHERE id_os IN (?)";

    db.query(query, [ids], (err, result) => {
        if (err) {
            console.error("Erro ao encerrar O.S. de dados:", err);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
        res.status(200).json({ message: 'Ordens de Serviço encerradas com sucesso.' });
    });
});

app.get('/os-dados-concluida', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.nome_cliente, c.razao_social,
            od.quantidade_auxiliar_os, od.quantidade_itens, od.descricao,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada,
            DATE_FORMAT(od.data_conclusao, '%d/%m/%Y %H:%i') AS data_conclusao_formatada -- Data de conclusão
        FROM 
            os_dados AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE -- Apenas as concluídas
        ORDER BY od.data_conclusao DESC; -- Ordena pelas mais recentes
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});


app.put('/os-conciliacao-concluida', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido para encerramento.' });
    }

    const query = "UPDATE os_conciliacao SET concluida = TRUE, data_conclusao = NOW() WHERE id_os IN (?)";

    db.query(query, [ids], (err, result) => {
        if (err) {
            console.error("Erro ao encerrar O.S. de dados:", err);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
        res.status(200).json({ message: 'Ordens de Serviço encerradas com sucesso.' });
    });
});

app.get('/os-conciliacao-concluida', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.numero_os, od.nome_cliente, c.razao_social,
            od.quantidade_auxiliar_os, od.quantidade_itens, od.descricao,
            DATE_FORMAT(od.data_criacao, '%d/%m/%Y %H:%i') AS data_formatada,
            DATE_FORMAT(od.data_conclusao, '%d/%m/%Y %H:%i') AS data_conclusao_formatada -- Data de conclusão
        FROM 
            os_conciliacao AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE -- Apenas as concluídas
        ORDER BY od.data_conclusao DESC; -- Ordena pelas mais recentes
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});




/////////////////Pedidos Concluidos ///////////////////

// ROTA PARA MARCAR UM OU MAIS PEDIDOS COMO CONCLUÍDOS (MÉTODO PUT)
app.put('/pedidos-concluidos', (req, res) => {
    const { ids } = req.body; // Recebe um array de IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Nenhum ID de pedido fornecido." });
    }


    const query = `
        UPDATE pedido
        SET concluida = TRUE, data_conclusao = NOW() 
        WHERE numeroPedido IN (?);
    `;

    db.query(query, [ids], (err, result) => {
        if (err) {
            console.error("Erro ao marcar pedidos como concluídos:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Nenhum pedido encontrado com os IDs fornecidos." });
        }
        return res.status(200).json({ message: "Pedidos marcados como concluídos com sucesso!" });
    });
});

// ROTA PARA VISUALIZAR OS PEDIDOS JÁ CONCLUÍDOS (MÉTODO GET)
app.get('/pedidos-concluidos', (req, res) => {
    const query = `
        SELECT 
            p.numeroPedido, p.nomeCliente, c.razao_social, p.unidade,
            p.quantidadeTotal, p.quantidadeAtribuida,
            DATE_FORMAT(p.data_inicio, '%d/%m/%Y %H:%i') AS data_formatada,
            DATE_FORMAT(p.data_conclusao, '%d/%m/%Y %H:%i') AS data_conclusao_formatada
        FROM 
            pedido AS p
        INNER JOIN 
            cliente AS c ON p.cnpj_cliente = c.cnpj
        WHERE 
            p.concluida = TRUE
        ORDER BY 
            p.data_conclusao DESC;
    `;
    db.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar pedidos de compra concluídos:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data);
    });
});


    module.exports = pool;

    // =================================================================
    // ||                       INICIA O SERVIDOR                     ||
    // =================================================================
    app.listen(port, () => {
        console.log(`Servidor backend rodando na porta ${port}`);
    });