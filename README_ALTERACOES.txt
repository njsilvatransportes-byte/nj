NJTransportes - versão editada

Alterações:
- Lançamentos de abastecimentos agora podem ser EDITADOS.
- Lançamentos de abastecimentos agora podem ser EXCLUÍDOS com confirmação.
- A edição reaproveita o formulário existente e carrega os dados do lançamento.
- A API do servidor ganhou suporte ao método DELETE.
- O salvamento/atualização preserva valores numéricos iguais a zero.

Projeto original preservado separadamente; esta pasta é a versão modificada.

Para usar:
1. Copie a pasta NJTransportes para o local desejado.
2. Mantenha o arquivo .env configurado com a conexão do banco.
3. Execute iniciar_sistema.bat ou `npm start`.
4. Abra http://localhost:3000/abastecimentos.html


Nova alteração:
- Barra de ações do formulário de abastecimento fixada na parte inferior da área de visualização, mantendo o botão Salvar abastecimento sempre acessível.
- Adicionado botão "Voltar para a página inicial" no topo da tela.


Nova alteração - Fretes:
- Adicionados os botões Editar e Excluir nos lançamentos de frete.
- Adicionado botão para voltar à página inicial.
- Barra de ações do formulário de frete fixada para manter Salvar/Cancelar acessíveis.
