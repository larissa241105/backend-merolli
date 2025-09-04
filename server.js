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
                console.log('Conectado com sucesso ao banco de dados PostgreSQL.');
            }
        });

        app.listen(port, () => {
            console.log(`Servidor rodando na porta ${port}`);
        });


    // =================================================================
    // ||                      ROTA DE LOGIN (SEGURA)                 ||
    // =================================================================
app.post('/api/login/analista', (req, res) => {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
        return res.status(400).json({ message: 'CPF e senha são obrigatórios.' });
    }

    const cpfLimpo = usuario.replace(/\D/g, '');
    const query = 'SELECT * FROM analista WHERE cpf = $1';

    pool.query(query, [cpfLimpo], async (err, results) => {
        if (err) {
            console.error("Erro ao buscar analista:", err);
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }

        // CORRIGIDO: Use 'results.rows' para acessar o array de resultados
        if (results.rows.length === 0) {
            return res.status(401).json({ message: 'CPF ou senha inválidos.' });
        }

        // CORRIGIDO: Use 'results.rows[0]' para acessar o primeiro resultado
        const analista = results.rows[0];

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
        const query = 'INSERT INTO auxiliar (cpf, nome, data_nascimento, senha) VALUES ($1, $2, $3, $4)';
        const values = [cpf.replace(/\D/g, ''), nome, data_nascimento, senhaHash];

        pool.query(query, values, (err, result) => {
            if (err) {
                // CORREÇÃO: Usar o código de erro do PostgreSQL para duplicidade
                if (err.code === '23505') return res.status(409).json({ message: 'CPF já cadastrado.' });
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
        const query = 'INSERT INTO analista (cpf, nome, data_nascimento, senha) VALUES ($1, $2, $3, $4)';
        const values = [cpf.replace(/\D/g, ''), nome, data_nascimento, senhaHash];

        pool.query(query, values, (err, result) => {
            if (err) {
                // CORREÇÃO: Usar o código de erro do PostgreSQL para duplicidade
                if (err.code === '23505') return res.status(409).json({ message: 'CPF já cadastrado.' });
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
        const query = 'INSERT INTO cliente (cnpj, razao_social, nome_fantasia, endereco, unidade, nome_responsavel, contato_responsavel, senha) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
        const values = [cnpj.replace(/\D/g, ''), razao_social, nome_fantasia, endereco, unidade, nome_responsavel, contato_responsavel, senhaHash];

        pool.query(query, values, (err, result) => {
            if (err) {
                // CORREÇÃO: Usar o código de erro do PostgreSQL para duplicidade
                if (err.code === '23505') return res.status(409).json({ message: 'Este CNPJ já está cadastrado.' });
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
    const query = 'SELECT razao_social, nome_fantasia FROM cliente WHERE cnpj = $1';
    
    pool.query(query, [cnpj.replace(/\D/g, '')], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor.' });
        }
        
        // CORRIGIDO: Verifique o tamanho de 'results.rows'
        if (results.rows.length > 0) { 
            // CORRIGIDO: Retorne o primeiro item de 'results.rows'

            return res.status(200).json(results.rows[0]); 
        }
        
        res.status(404).json({ message: 'Cliente não encontrado.' });
    });
});

   app.get('/api/auxiliares', (req, res) => {
    const query = 'SELECT id, nome, cpf FROM auxiliar ORDER BY nome ASC'; 

    pool.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar auxiliares:', err);
            return res.status(500).json({ message: 'Erro interno ao buscar dados dos auxiliares.' });
        }
        // CORREÇÃO: Usar .json(results.rows)
        res.status(200).json(results.rows);
    });
});



app.post('/api/pedidos', async (req, res) => {
    const { 
        cliente, 
        cnpj_cliente, 
        nomeResponsavel, 
        contatoResponsavel, 
        descricao, 
        precoUnidade, 
        precoTotal,
        unidades 
    } = req.body;

    if (!cnpj_cliente || !nomeResponsavel || !unidades || unidades.length === 0) {
        return res.status(400).json({ message: 'CNPJ, Nome do Responsável e ao menos uma Unidade são obrigatórios.' });
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
    const client = await pool.connect(); // Pega uma conexão do pool

    try {
        await client.query('BEGIN'); // Inicia a transação

        const pedidoQuery = `
            INSERT INTO pedido (
                numeropedido, nomecliente, cnpj_cliente, nomeresponsavel, contatoresponsavel, 
                descricao, precounidade, precototal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id;
        `;
        const pedidoValues = [
            novoNumeroPedido, cliente, cnpj_cliente.replace(/\D/g, ''), nomeResponsavel, 
            contatoResponsavel, descricao, precoUnidade, precoTotal
        ];
        
        const pedidoResult = await client.query(pedidoQuery, pedidoValues);
        const pedidoId = pedidoResult.rows[0].id;

        // 3. Itera sobre as unidades e insere cada uma na nova tabela
        const unidadeQuery = `
            INSERT INTO pedido_unidades (pedido_id, unidade_nome, quantidade) 
            VALUES ($1, $2, $3);
        `;
        for (const unidade of unidades) {
            await client.query(unidadeQuery, [pedidoId, unidade.nome, unidade.quantidade]);
        }

        await client.query('COMMIT'); // Finaliza a transação com sucesso

        res.status(201).json({ 
            message: 'Pedido e suas unidades cadastrados com sucesso!', 
            pedidoId: pedidoId, 
            numeroPedido: novoNumeroPedido 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Desfaz tudo em caso de erro
        console.error('Erro na transação de cadastro de pedido:', err);
        if (err.code === '23503') { // Erro de chave estrangeira (CNPJ não existe)
            return res.status(404).json({ message: 'Erro: O CNPJ informado não pertence a um cliente cadastrado.' });
        }
        res.status(500).json({ message: 'Erro interno ao cadastrar pedido.' });
    } finally {
        client.release(); // Libera a conexão de volta para o pool
    }
});



// GET /api/clientes/details-and-orders/:cnpj
app.get('/api/clientes/details-and-orders/:cnpj', async (req, res) => {
    const cnpjLimpo = req.params.cnpj.replace(/\D/g, '');
    if (!cnpjLimpo) return res.status(400).json({ message: 'CNPJ inválido.' });

    try {
        const responseData = { cliente: null, pedidos: [] };

        const clienteQuery = 'SELECT razao_social, nome_fantasia FROM cliente WHERE cnpj = $1';
        const clienteResults = await pool.query(clienteQuery, [cnpjLimpo]);

        if (clienteResults.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        responseData.cliente = clienteResults.rows[0];

        // A QUERY INTELIGENTE QUE CALCULA TUDO EM TEMPO REAL
        // Assumindo que você tenha as tabelas 'os_produto', 'os_dados' e 'os_conciliacao'
        const pedidosUnidadesQuery = `
            SELECT 
                p.numeropedido,
                pu.id AS unidade_id,
                pu.unidade_nome,
                pu.quantidade AS quantidade_total_unidade,
                
                COALESCE((SELECT SUM(os.quantidade_itens) FROM os_produto os WHERE os.pedido_unidade_id = pu.id), 0) +
                COALESCE((SELECT SUM(os_d.quantidade_itens) FROM os_dados os_d WHERE os_d.pedido_unidade_id = pu.id), 0) +
                COALESCE((SELECT SUM(os_c.quantidade_itens) FROM os_conciliacao os_c WHERE os_c.pedido_unidade_id = pu.id), 0)
                
                AS total_atribuido

            FROM pedido AS p
            JOIN pedido_unidades AS pu ON p.id = pu.pedido_id
            WHERE p.cnpj_cliente = $1 AND p.concluida = false
            ORDER BY p.numeropedido DESC, pu.unidade_nome ASC;
        `;
        const pedidosResults = await pool.query(pedidosUnidadesQuery, [cnpjLimpo]);
        
        // O frontend receberá o total e o total já atribuído
        responseData.pedidos = pedidosResults.rows;

        res.status(200).json(responseData);

    } catch (err) {
        console.error('Erro na rota de detalhes do cliente e unidades de pedido:', err);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});



   // POST /api/os-produto/fracionado
app.post('/api/os-produto/fracionado', async (req, res) => {
    const osArray = req.body;
    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const idAgrupador = uuidv4();
    const client = await pool.connect();

    try {
        // Transação ainda é útil para garantir que todas as O.S. do grupo sejam inseridas juntas
        await client.query('BEGIN');

        const insertPromises = osArray.map(async osData => {
            const {
                cnpj, cliente, unidade, numeroPedidoSelecionado,
                quantidade_auxiliar_os, idAuxiliarSelecionado, nomeAuxiliar,
                cpfAuxiliar, quantidadeItens, descricao, pedidoUnidadeId
            } = osData;

            const numero_os = `${numeroPedidoSelecionado}_${unidade.substring(0,3).toUpperCase()}_${idAuxiliarSelecionado}`;
            const cleanCpf = cpfAuxiliar ? cpfAuxiliar.replace(/\D/g, '') : null;
            
            const query = `
                INSERT INTO os_produto (
                    id_agrupador_os, numero_os, numero_pedido_origem, cnpj_cliente, nome_cliente, 
                    unidade_cliente, quantidade_auxiliar_os, nome_auxiliar, cpf_auxiliar, 
                    quantidade_itens, descricao, pedido_unidade_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            const values = [
                idAgrupador, numero_os, numeroPedidoSelecionado, cnpj.replace(/\D/g, ''), cliente,
                unidade, parseInt(quantidade_auxiliar_os, 10), nomeAuxiliar, cleanCpf,
                parseInt(quantidadeItens, 10), descricao, pedidoUnidadeId
            ];
            
            return client.query(query, values);
        });
        
        await Promise.all(insertPromises);
        await client.query('COMMIT'); 
        res.status(201).json({ message: 'O.S. cadastradas com sucesso!', createdCount: osArray.length });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error);
        res.status(error.status || 500).json({ message: error.message || 'Erro interno ao cadastrar Ordens de Serviço.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});




   app.post('/api/os-dados/fracionado', async (req, res) => {
    const osArray = req.body;

    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const { pedidoUnidadeId } = osArray[0]; 
    if (!pedidoUnidadeId) {
        return res.status(400).json({ message: 'A unidade do pedido de origem (pedidoUnidadeId) não foi especificada.' });
    }

    const idAgrupador = uuidv4();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const totalItensNestaOS = osArray.reduce((acc, os) => acc + parseInt(os.quantidadeItens, 10), 0);

        const insertPromises = osArray.map(async osData => {
            // CORREÇÃO 1: Adicionar 'quantidade_auxiliar_os' à desestruturação
            const {
                cnpj, cliente, unidade, numeroPedidoSelecionado,
                idAuxiliarSelecionado, nomeAuxiliar, cpfAuxiliar,
                quantidadeItens, descricao, quantidade_auxiliar_os 
            } = osData;

            const numero_os = `${numeroPedidoSelecionado}_00${idAuxiliarSelecionado}`;
            const cleanCpf = cpfAuxiliar ? cpfAuxiliar.replace(/\D/g, '') : null;
            
            // CORREÇÃO 2: Adicionar a coluna 'quantidade_auxiliar_os' na query
            const query = `
                INSERT INTO os_dados (
                    id_agrupador_os, numero_os, numero_pedido_origem, cnpj_cliente, nome_cliente, 
                    unidade_cliente, quantidade_auxiliar_os, nome_auxiliar, cpf_auxiliar, 
                    quantidade_itens, descricao, pedido_unidade_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            // CORREÇÃO 3: Adicionar o valor de 'quantidade_auxiliar_os' no array de valores
            const values = [
                idAgrupador, numero_os, numeroPedidoSelecionado, cnpj.replace(/\D/g, ''), cliente,
                unidade, parseInt(quantidade_auxiliar_os, 10), nomeAuxiliar, cleanCpf, 
                parseInt(quantidadeItens, 10), descricao, pedidoUnidadeId
            ];
            
            return client.query(query, values);
        });

        await Promise.all(insertPromises);
        
        const updateQuery = `
            UPDATE pedido_unidades 
            SET quantidade_atribuida_os = quantidade_atribuida_os + $1
            WHERE id = $2;
        `;
        await client.query(updateQuery, [totalItensNestaOS, pedidoUnidadeId]);

        await client.query('COMMIT'); 

        res.status(201).json({ 
            message: 'O.S. cadastradas e pedido atualizado com sucesso!', 
            createdCount: osArray.length 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error);
        res.status(error.status || 500).json({ 
            message: error.message || 'Erro interno ao cadastrar Ordens de Serviço.' 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});



      app.post('/api/os-conciliacao/fracionado', async (req, res) => {
    const osArray = req.body;

    if (!Array.isArray(osArray) || osArray.length === 0) {
        return res.status(400).json({ message: 'O corpo da requisição deve ser um array de O.S.' });
    }

    const { pedidoUnidadeId } = osArray[0]; 
    if (!pedidoUnidadeId) {
        return res.status(400).json({ message: 'A unidade do pedido de origem (pedidoUnidadeId) não foi especificada.' });
    }

    const idAgrupador = uuidv4();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const totalItensNestaOS = osArray.reduce((acc, os) => acc + parseInt(os.quantidadeItens, 10), 0);

        const insertPromises = osArray.map(async osData => {
            // CORREÇÃO 1: Adicionar 'quantidade_auxiliar_os' à desestruturação
            const {
                cnpj, cliente, unidade, numeroPedidoSelecionado,
                idAuxiliarSelecionado, nomeAuxiliar, cpfAuxiliar,
                quantidadeItens, descricao, quantidade_auxiliar_os 
            } = osData;

            const numero_os = `${numeroPedidoSelecionado}_00${idAuxiliarSelecionado}`;
            const cleanCpf = cpfAuxiliar ? cpfAuxiliar.replace(/\D/g, '') : null;
            
            // CORREÇÃO 2: Adicionar a coluna 'quantidade_auxiliar_os' na query
            const query = `
                INSERT INTO os_conciliacao (
                    id_agrupador_os, numero_os, numero_pedido_origem, cnpj_cliente, nome_cliente, 
                    unidade_cliente, quantidade_auxiliar_os, nome_auxiliar, cpf_auxiliar, 
                    quantidade_itens, descricao, pedido_unidade_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;
            // CORREÇÃO 3: Adicionar o valor de 'quantidade_auxiliar_os' no array de valores
            const values = [
                idAgrupador, numero_os, numeroPedidoSelecionado, cnpj.replace(/\D/g, ''), cliente,
                unidade, parseInt(quantidade_auxiliar_os, 10), nomeAuxiliar, cleanCpf, 
                parseInt(quantidadeItens, 10), descricao, pedidoUnidadeId
            ];
            
            return client.query(query, values);
        });

        await Promise.all(insertPromises);
        
        const updateQuery = `
            UPDATE pedido_unidades 
            SET quantidade_atribuida_os = quantidade_atribuida_os + $1
            WHERE id = $2;
        `;
        await client.query(updateQuery, [totalItensNestaOS, pedidoUnidadeId]);

        await client.query('COMMIT'); 

        res.status(201).json({ 
            message: 'O.S. cadastradas e pedido atualizado com sucesso!', 
            createdCount: osArray.length 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERRO NA TRANSAÇÃO, ROLLBACK REALIZADO:", error);
        res.status(error.status || 500).json({ 
            message: error.message || 'Erro interno ao cadastrar Ordens de Serviço.' 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});



    // =================================================================
    // ||                ROTAS DE VISUALIZAÇÃO GERAL                  ||
    // =================================================================

    
    app.get('/visualizarauxiliar', (req, res) => {
    const query = 'SELECT nome, cpf, data_nascimento FROM auxiliar'; 
    pool.query(query, (err, data) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        // CORREÇÃO: Usar data.rows
        return res.status(200).json(data.rows);
    });
});

   app.get('/visualizaranalista', (req, res) => {
    const query = 'SELECT nome, cpf, data_nascimento FROM analista'; 
    pool.query(query, (err, data) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        // CORREÇÃO: Usar data.rows
        return res.status(200).json(data.rows);
    });
});

  app.get('/visualizarcliente', (req, res) => {
    const query = 'SELECT razao_social, nome_responsavel, contato_responsavel, nome_fantasia, cnpj, unidade, endereco FROM cliente';
    pool.query(query, (err, data) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        // CORREÇÃO: Usar data.rows
        return res.status(200).json(data.rows);
    });
});



app.get('/visualizarpedido', (req, res) => {

    const query = `
        SELECT 
            p.numeropedido, 
            p.nomecliente, 
            p.descricao,
            TO_CHAR(p.data_inicio, 'DD/MM/YYYY HH24:MI') AS data_formatada,
            c.razao_social,
            pu.id AS unidade_id, -- ID único da linha da unidade, para usar como "key" no React
            pu.unidade_nome,
            pu.quantidade,
        FROM 
            pedido AS p
        INNER JOIN 
            pedido_unidades AS pu ON p.id = pu.pedido_id
        INNER JOIN 
            cliente AS c ON p.cnpj_cliente = c.cnpj
        WHERE 
            p.concluida = false
        ORDER BY 
            p.data_inicio DESC, pu.unidade_nome ASC;
    `;

    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar detalhes dos pedidos por unidade:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data.rows);
    });
});



app.get('/visualizarosproduto', (req, res) => {
    const query = `
    SELECT 
        od.numero_os, 
        od.id_os, 
        od.nome_cliente, 
        c.razao_social,
        od.unidade_cliente, -- <<< ADICIONADO: Traz o nome da unidade
        od.nome_auxiliar, 
        od.quantidade_itens, 
        od.descricao,
        TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada
    FROM 
        os_produto AS od
    INNER JOIN 
        cliente AS c ON od.cnpj_cliente = c.cnpj
    WHERE 
        od.concluida = '0' -- CORREÇÃO: Comparando com '0' (VARCHAR) como definido no seu banco
    ORDER BY od.id_os DESC
`;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_produto' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data.rows);
    });
});




app.get('/visualizarosdados', (req, res) => {
    const query = `
    SELECT 
        od.numero_os, 
        od.id_os, 
        od.nome_cliente, 
        c.razao_social,
        od.unidade_cliente, -- <<< ADICIONADO: Traz o nome da unidade
        od.nome_auxiliar, 
        od.quantidade_itens, 
        od.descricao,
        TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada
    FROM 
        os_dados AS od
    INNER JOIN 
        cliente AS c ON od.cnpj_cliente = c.cnpj
    WHERE 
        od.concluida = '0' -- CORREÇÃO: Comparando com '0' (VARCHAR) como definido no seu banco
    ORDER BY od.id_os DESC
`;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_dados' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data.rows);
    });
});


app.get('/visualizarosconciliacao', (req, res) => {
    const query = `
    SELECT 
        od.numero_os, 
        od.id_os, 
        od.nome_cliente, 
        c.razao_social,
        od.unidade_cliente, -- <<< ADICIONADO: Traz o nome da unidade
        od.nome_auxiliar, 
        od.quantidade_itens, 
        od.descricao,
        TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada
    FROM 
        os_conciliacao AS od
    INNER JOIN 
        cliente AS c ON od.cnpj_cliente = c.cnpj
    WHERE 
        od.concluida = '0' -- CORREÇÃO: Comparando com '0' (VARCHAR) como definido no seu banco
    ORDER BY od.id_os DESC
`;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro no servidor ao buscar 'os_conciliacao' em aberto:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        return res.status(200).json(data.rows);
    });
});


    // =================================================================
    // ||                ROTAS DE GERENCIAMENTO (CRUD)                ||
    // =================================================================

    // --- Gerenciamento de Auxiliar por CPF ---
   app.get('/visualizarauxiliar/:cpf', (req, res) => {
    const query = 'SELECT nome, cpf, data_nascimento FROM auxiliar WHERE cpf = $1';
    pool.query(query, [req.params.cpf], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        
        // CORREÇÃO 1: Usar results.rows.length
        if (results.rows.length === 0) return res.status(404).json({ message: "Auxiliar não encontrado." });
        
        // CORREÇÃO 2: Usar results.rows[0]
        return res.status(200).json(results.rows[0]);
    });
});

    app.put('/editar-auxiliar/:cpf', (req, res) => {
    const { nome, cpf, data_nascimento } = req.body;
    if (!nome || !cpf || !data_nascimento) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    
    const query = 'UPDATE auxiliar SET nome = $1, cpf = $2, data_nascimento = $3 WHERE cpf = $4';
    
    pool.query(query, [nome, cpf, data_nascimento, req.params.cpf], (err, result) => {
        if (err) {
            // CORREÇÃO 1: Usar o código de erro do PostgreSQL para duplicidade
            if (err.code === '23505') return res.status(409).json({ message: 'CPF já pertence a outro usuário.' });
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) return res.status(404).json({ message: 'Auxiliar não encontrado.' });
        
        res.status(200).json({ message: 'Auxiliar atualizado com sucesso!' });
    });
});

// Substitua sua rota app.delete('/deletar-auxiliar/:cpf', ...) por esta:

app.delete('/deletar-auxiliar/:cpf', (req, res) => {
    const { cpf } = req.params;

    // 1. Query para verificar se o CPF do auxiliar está vinculado a alguma OS
    const checkOsQuery = `
        SELECT COUNT(*) AS total FROM (
            SELECT cpf_auxiliar FROM os_produto WHERE cpf_auxiliar = $1
            UNION ALL
            SELECT cpf_auxiliar FROM os_conciliacao WHERE cpf_auxiliar = $2
            UNION ALL
            SELECT cpf_auxiliar FROM os_dados WHERE cpf_auxiliar = $3
        ) AS combined_os
    `;
    
    const params = [cpf, cpf, cpf];

    pool.query(checkOsQuery, params, (err, results) => {
        if (err) {
            console.error("Erro ao verificar vínculo do auxiliar com O.S.:", err);
            return res.status(500).json({ message: "Erro interno no servidor ao verificar as O.S." });
        }

        const linkedOsCount = parseInt(results.rows[0].total, 10);

        // 2. Se houver vínculo, retorna um erro de conflito
        if (linkedOsCount > 0) {
            return res.status(409).json({
                message: `Este analista não pode ser excluído, pois está vinculado a ${linkedOsCount} Ordem(ns) de Serviço.`
            });
        }
        
        // 3. Se não houver vínculo, prossegue com a exclusão
        const deleteQuery = 'DELETE FROM auxiliar WHERE cpf = $1';
        
        pool.query(deleteQuery, [cpf], (deleteErr, deleteResult) => {
            if (deleteErr) {
                console.error("Erro ao deletar auxiliar:", deleteErr);
                return res.status(500).json({ message: "Erro interno no servidor ao deletar o analista." });
            }
            
            if (deleteResult.rowCount === 0) {
                return res.status(404).json({ message: "Analista não encontrado." });
            }
            
            res.status(200).json({ message: 'Analista deletado com sucesso!' });
        });
    });
});

        app.get('/visualizaranalista/:cpf', (req, res) => {
            const query = 'SELECT nome, cpf, data_nascimento FROM analista WHERE cpf = $1';
            pool.query(query, [req.params.cpf], (err, results) => {
                if (err) return res.status(500).json({ message: "Erro interno no servidor." });
                
                // CORREÇÃO 1: Usar results.rows.length
                if (results.rows.length === 0) return res.status(404).json({ message: "Analista não encontrado." });
                
                // CORREÇÃO 2: Usar results.rows[0]
                return res.status(200).json(results.rows[0]);
            });
        });

   app.put('/editar-analista/:cpf', (req, res) => {
    const { nome, cpf, data_nascimento } = req.body;
    if (!nome || !cpf || !data_nascimento) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    
    const query = 'UPDATE analista SET nome = $1, cpf = $2, data_nascimento = $3 WHERE cpf = $4';
    
    pool.query(query, [nome, cpf, data_nascimento, req.params.cpf], (err, result) => {
        if (err) {
            // CORREÇÃO 1: Usar o código de erro do PostgreSQL
            if (err.code === '23505') return res.status(409).json({ message: 'CPF já pertence a outro usuário.' });
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) return res.status(404).json({ message: 'Analista não encontrado.' });
        
        res.status(200).json({ message: 'Analista atualizado com sucesso!' });
    });
});
        
    app.delete('/deletar-analista/:cpf', (req, res) => {
    const query = 'DELETE FROM analista WHERE cpf = $1';
    
    pool.query(query, [req.params.cpf], (err, result) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        
        // CORREÇÃO: Usar result.rowCount
        if (result.rowCount === 0) return res.status(404).json({ message: "Analista não encontrado." });
        
        res.status(200).json({ message: 'Analista deletado com sucesso!' });
    });
});

    // --- Gerenciamento de Cliente por CNPJ ---
  app.get('/visualizarcliente/:cnpj', (req, res) => {
    const query = 'SELECT nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel FROM cliente WHERE cnpj = $1';
    pool.query(query, [req.params.cnpj], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        
        // CORREÇÃO 1: Usar results.rows.length
        if (results.rows.length === 0) return res.status(404).json({ message: "Cliente não encontrado." });
        
        // CORREÇÃO 2: Usar results.rows[0]
        return res.status(200).json(results.rows[0]);
    });
});

  app.put('/editar-cliente/:cnpj', (req, res) => {
    const { nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel } = req.body;
    if (!nome_fantasia || !cnpj || !unidade || !endereco) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    
    const query = 'UPDATE cliente SET nome_fantasia = $1, cnpj = $2, unidade = $3, endereco = $4, razao_social = $5, nome_responsavel = $6, contato_responsavel = $7 WHERE cnpj = $8';
    
    pool.query(query, [nome_fantasia, cnpj, unidade, endereco, razao_social, nome_responsavel, contato_responsavel, req.params.cnpj], (err, result) => {
        if (err) {
            // CORREÇÃO 1: Usar o código de erro do PostgreSQL
            if (err.code === '23505') return res.status(409).json({ message: 'CNPJ já pertence a outro cliente.' });
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
        
        res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
    });
});


app.delete('/deletar-cliente/:cnpj', (req, res) => {
    const { cnpj } = req.params;

    const checkPedidosQuery = 'SELECT COUNT(*) AS total FROM pedido WHERE CNPJ_Cliente = $1';
    
    pool.query(checkPedidosQuery, [cnpj], (err, results) => {
        if (err) {
            console.error("Erro ao verificar pedidos do cliente:", err);
            return res.status(500).json({ message: "Erro interno no servidor ao verificar os pedidos." });
        }
        
        // CORREÇÃO 1: Usar results.rows[0].total para acessar o total
        const pedidosCount = results.rows[0].total;

        if (pedidosCount > 0) {
            return res.status(409).json({ 
                message: `Este cliente não pode ser excluído, pois possui ${pedidosCount} pedido(s) vinculado(s).` 
            });
        }

        const deleteQuery = 'DELETE FROM cliente WHERE cnpj = $1';

        pool.query(deleteQuery, [cnpj], (deleteErr, deleteResult) => {
            if (deleteErr) {
                return res.status(500).json({ message: "Erro interno no servidor ao deletar o cliente." });
            }
            // CORREÇÃO 2: Usar deleteResult.rowCount
            if (deleteResult.rowCount === 0) {
                return res.status(404).json({ message: "Cliente não encontrado." });
            }
            res.status(200).json({ message: 'Cliente deletado com sucesso!' });
        });
    });
});

app.get('/api/pedidos/:numeropedido', (req, res) => {
    const { numeropedido } = req.params;
    const query = 'SELECT * FROM pedido WHERE numeropedido = $1';

    pool.query(query, [numeropedido], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 1: Usar result.rows.length
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        // CORREÇÃO 2: Usar result.rows[0]
        res.status(200).json(result.rows[0]);
    });
});


// ROTA PUT PARA ATUALIZAR UM PEDIDO EXISTENTE
app.put('/api/pedidos/:numeropedido', (req, res) => {
    const { numeropedido: paramNumeroPedido } = req.params;
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

    if (!cliente || !cnpj_cliente || !nomeResponsavel) {
        return res.status(400).json({ message: 'Cliente, CNPJ e Responsável são obrigatórios.' });
    }

    const query = `
        UPDATE pedido SET 
            nomecliente = $1, 
            cnpj_cliente = $2, 
            nomeresponsavel = $3, 
            contatoresponsavel = $4, 
            descricao = $5, 
            quantidadetotal = $6, 
            quantidadeatribuida = $7, 
            precounidade = $8, 
            precototal = $9 
        WHERE numeropedido = $10
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

    pool.query(query, values, (err, result) => {
        if (err) {
            // CORREÇÃO 1: Usar o código de erro do PostgreSQL para violação de chave estrangeira
            if (err.code === '23503') { 
                return res.status(404).json({ message: 'Erro: O CNPJ informado não pertence a um cliente cadastrado.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar o pedido.', error: err });
        }
        
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json({ message: 'Pedido atualizado com sucesso!' });
    });
});



    app.delete('/api/pedidos/:numeropedido', (req, res) => {
    const { numeropedido } = req.params;

    const checkOsQuery = `
        SELECT COUNT(*) AS total FROM (
            SELECT numero_pedido_origem FROM os_produto WHERE numero_pedido_origem = $1
            UNION ALL
            SELECT numero_pedido_origem FROM os_conciliacao WHERE numero_pedido_origem = $2
            UNION ALL
            SELECT numero_pedido_origem FROM os_dados WHERE numero_pedido_origem = $3
        ) AS combined_os
    `;
    
    const params = [
        numeropedido, 
        numeropedido,
        numeropedido
    ];

    pool.query(checkOsQuery, params, (err, results) => {
        if (err) {
            console.error("Erro ao verificar O.S. vinculadas:", err);
            return res.status(500).json({ message: "Erro interno no servidor ao verificar as O.S." });
        }

        // CORREÇÃO 1: Usar results.rows[0].total
        const openOsCount = results.rows[0].total;

        if (openOsCount > 0) {
            return res.status(409).json({
                message: `Este pedido não pode ser excluído, pois possui ${openOsCount} Ordem(ns) de Serviço vinculados a esse pedido.`
            });
        }
        
        const deleteQuery = 'DELETE FROM pedido WHERE numeropedido = $1';
        
        pool.query(deleteQuery, [numeropedido], (deleteErr, deleteResult) => {
            if (deleteErr) {
                return res.status(500).json({ message: "Erro interno no servidor ao deletar o pedido." });
            }
            // CORREÇÃO 3: Usar deleteResult.rowCount
            if (deleteResult.rowCount === 0) {
                return res.status(404).json({ message: "Pedido não encontrado." });
            }
            res.status(200).json({ message: 'Pedido deletado com sucesso!' });
        });
    });
});

    app.get('/api/os-produto/:id_os', (req, res) => {
    const { id_os } = req.params;
    const query = 'SELECT * FROM os_produto WHERE id_os = $1';

    pool.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 1: Usar result.rows.length
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        // CORREÇÃO 2: Usar result.rows[0]
        res.status(200).json(result.rows[0]);
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
        quantidade_itens,
        cpf_auxiliar
    } = req.body;

    if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
        return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
    }

    const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

    const query = `
        UPDATE os_produto SET 
            numero_os = $1,
            numero_pedido_origem = $2,
            cnpj_cliente = $3,
            nome_cliente = $4,
            unidade_cliente = $5,
            nome_auxiliar = $6,
            descricao = $7,
            quantidade_itens = $8,
            cpf_auxiliar = $9
        WHERE id_os = $10
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
        cpf_auxiliar,
        id_os 
    ];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error("Erro ao atualizar O.S. de Produto:", err);
            // CORREÇÃO 1: Usar os códigos de erro do PostgreSQL
            if (err.code === '23505') { 
                return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
            }
            if (err.code === '23503') { 
                return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
        }
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json({ message: 'Ordem de Serviço atualizada com sucesso!' });
    });
});


// DELETE /api/os-produto/:id
app.delete('/api/os-produto/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM os_produto WHERE id_os = $1';

    pool.query(query, [id], (err, result) => {
        if (err) {
            console.error("Erro ao excluir a O.S.:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
        }
        res.status(200).json({ message: "Ordem de Serviço excluída com sucesso!" });
    });
});


app.get('/api/os-dados/:id_os', (req, res) => {
    const { id_os } = req.params;
    const query = 'SELECT * FROM os_dados WHERE id_os = $1';

    pool.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 1: Usar result.rows.length
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        // CORREÇÃO 2: Usar result.rows[0]
        res.status(200).json(result.rows[0]);
    });
});

app.get('/api/os-conciliacao/:id_os', (req, res) => {
    const { id_os } = req.params;
    const query = 'SELECT * FROM os_conciliacao WHERE id_os = $1';

    pool.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 1: Usar result.rows.length
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        // CORREÇÃO 2: Usar result.rows[0]
        res.status(200).json(result.rows[0]);
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
        quantidade_itens,
        cpf_auxiliar
    } = req.body;

    if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
        return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
    }

    const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

    const query = `
        UPDATE os_dados SET 
           numero_os = $1,
            numero_pedido_origem = $2,
            cnpj_cliente = $3,
            nome_cliente = $4,
            unidade_cliente = $5,
            nome_auxiliar = $6,
            descricao = $7,
            quantidade_itens = $8,
            cpf_auxiliar = $9
        WHERE id_os = $10
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
        cpf_auxiliar,
        id_os 
    ];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error("Erro ao atualizar O.S. de Dados:", err);
            // CORREÇÃO 1: Usar os códigos de erro do PostgreSQL
            if (err.code === '23505') {
                return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
            }
            if (err.code === '23503') {
                return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
        }

        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) {
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
        quantidade_itens,
        cpf_auxiliar
    } = req.body;

    if (!numero_pedido_origem || !cnpj_cliente || !id_auxiliar) {
        return res.status(400).json({ message: 'Pedido de Origem, CNPJ e Auxiliar são obrigatórios.' });
    }

    const novo_numero_os = `${numero_pedido_origem}_00${id_auxiliar}`;

    const query = `
        UPDATE os_conciliacao SET 
             numero_os = $1,
            numero_pedido_origem = $2,
            cnpj_cliente = $3,
            nome_cliente = $4,
            unidade_cliente = $5,
            nome_auxiliar = $6,
            descricao = $7,
            quantidade_itens = $8,
            cpf_auxiliar = $9
        WHERE id_os = $10
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
        cpf_auxiliar,
        id_os 
    ];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error("Erro ao atualizar O.S.:", err);
            // CORREÇÃO 1: Usar os códigos de erro do PostgreSQL
            if (err.code === '23505') {
                return res.status(409).json({ message: `O número de O.S. '${novo_numero_os}' já existe.` });
            }
            if (err.code === '23503') {
                return res.status(404).json({ message: 'Erro: O Pedido de Origem ou o CNPJ informado não existem.' });
            }
            return res.status(500).json({ message: 'Erro interno ao atualizar a Ordem de Serviço.', error: err });
        }

        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ordem de Serviço não encontrada.' });
        }
        res.status(200).json({ message: 'Ordem de Serviço atualizada com sucesso!' });
    });
});



app.delete('/api/os-dados/:id_os', (req, res) => {
    const { id_os } = req.params;
    const query = 'DELETE FROM os_dados WHERE id_os = $1';

    pool.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Erro interno no servidor ao deletar a OS." });
        }
        // CORREÇÃO: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
        }
        res.status(200).json({ message: 'Ordem de Serviço deletada com sucesso!' });
    });
});

app.delete('/api/os-conciliacao/:id_os', (req, res) => {
    const { id_os } = req.params;
    const query = 'DELETE FROM os_conciliacao WHERE id_os = $1';

    pool.query(query, [id_os], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Erro interno no servidor ao deletar a OS." });
        }
        // CORREÇÃO: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Ordem de Serviço não encontrada." });
        }
        res.status(200).json({ message: 'Ordem de Serviço deletada com sucesso!' });
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////




    // --- GERENCIAMENTO DE PEDIDO ---

     // --- Gerenciamento de Cliente por CNPJ ---
 app.get('/visualizarpedido/:numeropedido', (req, res) => {
    const query = `SELECT numeropedido, nomecliente, cnpj_cliente, 
    descricao, quantidadetotal, quantidadeatribuida, precounidade, precototal, 
    nomeresponsavel, contatoresponsavel FROM pedido WHERE numeropedido = $1`;
    pool.query(query, [req.params.numeropedido], (err, results) => {
        if (err) return res.status(500).json({ message: "Erro interno no servidor." });
        
        // CORREÇÃO 1: Usar results.rows.length
        if (results.rows.length === 0) return res.status(404).json({ message: "Pedido não encontrado." });
        
        // CORREÇÃO 2: Usar results.rows[0]
        return res.status(200).json(results.rows[0]);
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

    // CORREÇÃO 1: Gerar placeholders dinamicamente
    // Ex: ['a', 'b', 'c'] -> '$1, $2, $3'
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    
    // Agora a query é construída com os placeholders corretos
    const query = `UPDATE os_produto SET concluida = true, data_conclusao = NOW() WHERE id_os IN (${placeholders})`;

    pool.query(query, ids, (err, result) => {
        if (err) {
            console.error("Erro ao encerrar O.S.:", err);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 2: Verificar o número de linhas afetadas
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Nenhuma O.S. encontrada com os IDs fornecidos.' });
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
            -- CORREÇÃO 1: Usar TO_CHAR no lugar de DATE_FORMAT
            TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada,
            TO_CHAR(od.data_conclusao, 'DD/MM/YYYY HH24:MI') AS data_conclusao_formatada 
        FROM 
            os_produto AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE 
        ORDER BY od.data_conclusao DESC;
    `;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        // CORREÇÃO 2: Usar data.rows
        return res.status(200).json(data.rows);
    });
});

app.put('/os-dados-concluida', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido para encerramento.' });
    }

    // CORREÇÃO 1: Gerar placeholders dinamicamente
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    
    // A query é construída com os placeholders corretos
    const query = `UPDATE os_dados SET concluida = TRUE, data_conclusao = NOW() WHERE id_os IN (${placeholders})`;

    pool.query(query, ids, (err, result) => {
        if (err) {
            console.error("Erro ao encerrar O.S. de dados:", err);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 2: Verificar o número de linhas afetadas
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Nenhuma O.S. encontrada com os IDs fornecidos.' });
        }
        res.status(200).json({ message: 'Ordens de Serviço encerradas com sucesso.' });
    });
});


app.get('/os-dados-concluida', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.nome_cliente, c.razao_social,
            od.quantidade_auxiliar_os, od.quantidade_itens, od.descricao,
            -- CORREÇÃO 1: Usar TO_CHAR em vez de DATE_FORMAT
            TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada,
            TO_CHAR(od.data_conclusao, 'DD/MM/YYYY HH24:MI') AS data_conclusao_formatada 
        FROM 
            os_dados AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE 
        ORDER BY od.data_conclusao DESC;
    `;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        // CORREÇÃO 2: Usar data.rows
        return res.status(200).json(data.rows);
    });
});


app.put('/os-conciliacao-concluida', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Nenhum ID fornecido para encerramento.' });
    }

    // CORREÇÃO 1: Gerar placeholders dinamicamente
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    
    // A query é construída com os placeholders corretos
    const query = `UPDATE os_conciliacao SET concluida = TRUE, data_conclusao = NOW() WHERE id_os IN (${placeholders})`;

    pool.query(query, ids, (err, result) => {
        if (err) {
            console.error("Erro ao encerrar O.S. de dados:", err);
            return res.status(500).json({ error: 'Erro interno no servidor.' });
        }
        // CORREÇÃO 2: Verificar o número de linhas afetadas
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Nenhuma O.S. encontrada com os IDs fornecidos.' });
        }
        res.status(200).json({ message: 'Ordens de Serviço encerradas com sucesso.' });
    });
});



app.get('/os-conciliacao-concluida', (req, res) => {
    const query = `
        SELECT 
            od.id_os, od.numero_os, od.nome_cliente, c.razao_social,
            od.quantidade_auxiliar_os, od.quantidade_itens, od.descricao,
            -- CORREÇÃO 1: Usar TO_CHAR em vez de DATE_FORMAT
            TO_CHAR(od.data_criacao, 'DD/MM/YYYY HH24:MI') AS data_formatada,
            TO_CHAR(od.data_conclusao, 'DD/MM/YYYY HH24:MI') AS data_conclusao_formatada 
        FROM 
            os_conciliacao AS od
        INNER JOIN 
            cliente AS c ON od.cnpj_cliente = c.cnpj
        WHERE 
            od.concluida = TRUE 
        ORDER BY od.data_conclusao DESC;
    `;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar O.S. de dados concluídas:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        // CORREÇÃO 2: Usar data.rows
        return res.status(200).json(data.rows);
    });
});




/////////////////Pedidos Concluidos ///////////////////

// ROTA PARA MARCAR UM OU MAIS PEDIDOS COMO CONCLUÍDOS (MÉTODO PUT)
app.put('/pedidos-concluidos', (req, res) => {
    const { ids } = req.body; // Recebe um array de IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Nenhum ID de pedido fornecido." });
    }

    // CORREÇÃO 1: Gerar placeholders dinamicamente
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
        UPDATE pedido
        SET concluida = TRUE, data_conclusao = NOW() 
        WHERE numeropedido IN (${placeholders});
    `;

    pool.query(query, ids, (err, result) => {
        if (err) {
            console.error("Erro ao marcar pedidos como concluídos:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        // CORREÇÃO 2: Usar result.rowCount
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Nenhum pedido encontrado com os IDs fornecidos." });
        }
        return res.status(200).json({ message: "Pedidos marcados como concluídos com sucesso!" });
    });
});


// ROTA PARA VISUALIZAR OS PEDIDOS JÁ CONCLUÍDOS (MÉTODO GET)
app.get('/pedidos-concluidos', (req, res) => {
    const query = `
        SELECT 
            p.numeropedido, p.nomecliente, c.razao_social, p.unidade,
            p.quantidadetotal, p.quantidadeatribuida,
            -- CORREÇÃO 1: Usar TO_CHAR em vez de DATE_FORMAT
            TO_CHAR(p.data_inicio, 'DD/MM/YYYY HH24:MI') AS data_formatada,
            TO_CHAR(p.data_conclusao, 'DD/MM/YYYY HH24:MI') AS data_conclusao_formatada
        FROM 
            pedido AS p
        INNER JOIN 
            cliente AS c ON p.cnpj_cliente = c.cnpj
        WHERE 
            p.concluida = TRUE
        ORDER BY 
            p.data_conclusao DESC;
    `;
    pool.query(query, (err, data) => {
        if (err) {
            console.error("Erro ao buscar pedidos de compra concluídos:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }
        // CORREÇÃO 2: Usar data.rows
        return res.status(200).json(data.rows);
    });
});


    module.exports = pool;

    // =================================================================
    // ||                       INICIA O SERVIDOR                     ||
    // =================================================================
    app.listen(port, () => {
        console.log(`Servidor backend rodando na porta ${port}`);
    });