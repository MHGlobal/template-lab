# RS Local Storage v2

Servidor privado de ficheiros para Android, pensado para partilhar o armazenamento do telefone com um PC ligado diretamente ao hotspot do próprio telefone.

## v2 Redmi/HyperOS
- Servidor escuta em todas as interfaces IPv4 locais na porta 8080, evitando escolher a interface errada no HyperOS.
- Só aceita clientes IPv4 privados (10/8, 172.16/12 ou 192.168/16) e loopback para teste no próprio telefone.
- Login obrigatório com PBKDF2-HMAC-SHA256, sessões aleatórias, expiração e bloqueio após tentativas falhadas.
- Mostra todos os endereços privados detetados e, após a primeira ligação válida, mostra o endereço confirmado usado pelo PC.
- Download telefone → PC e upload PC → telefone.
- Upload não substitui ficheiros existentes: cria um nome único automaticamente.
- Não inclui função de apagar ficheiros.

## Limitações do Android
`MANAGE_EXTERNAL_STORAGE` dá acesso amplo ao armazenamento partilhado, mas o Android continua a proteger áreas privadas de outras aplicações.
